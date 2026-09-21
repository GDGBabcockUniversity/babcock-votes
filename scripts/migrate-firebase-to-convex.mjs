/**
 * One-off migration: Firebase (Firestore + Storage) -> Convex.
 *
 * Safe to re-run: every write is an upsert keyed by the Firebase ID (kept in
 * each document's `legacyId`), votes that already exist are skipped and only
 * newly inserted votes touch the counters, and uploaded images are remembered
 * in .migration-files.json so they aren't uploaded twice.
 *
 * Only users who completed registration (have a Firestore `users` profile) are
 * migrated. Firebase Auth accounts that never registered are skipped, since
 * they just sign in and register again. Google users keep their account: their
 * migrated profile has a verified email, so their first Google sign-in links
 * to it. Part-time students get NEW random passwords (written to
 * migrated-credentials-<timestamp>.csv).
 *
 * Usage:
 *   node scripts/migrate-firebase-to-convex.mjs [--dry-run] [--skip-files]
 *        [--skip-accounts] [--skip-analytics] [--firebase-key=<file>]
 *
 * Target: the deployment in NEXT_PUBLIC_CONVEX_URL (.env.local) with its
 * OPS_SECRET. Source: FIREBASE_SERVICE_ACCOUNT_KEY (.env) or --firebase-key.
 * Do the real run while no election is active, so no votes land in Firestore
 * mid-migration, and re-run right before cutover to pick up stragglers.
 *
 * Resumable: Firestore's free tier only allows ~50k reads a day, which one
 * full run can exceed. Progress is saved in .migration-progress.json (finished
 * steps, and how far through `votes` it got with the tallies so far), so after
 * a quota error just run it again later (or enable billing) and it continues.
 * Use --fresh to start over, e.g. for the final run right before cutover.
 *
 * Flags:
 *   --fresh           ignore saved progress and re-read everything
 *   --dry-run         read Firebase and report; write nothing
 *   --skip-files      leave images behind (no photos/logos)
 *   --skip-accounts   don't create part-time password accounts
 *   --skip-analytics  don't regenerate the analytics summaries at the end
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { randomBytes } from "crypto";
import { extname, resolve } from "path";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { CONVEX_URL, chunk, matricToDocId, ops } from "./lib/convex.mjs";

const DRY_RUN = process.argv.includes("--dry-run");
const SKIP_FILES = process.argv.includes("--skip-files");
const SKIP_ACCOUNTS = process.argv.includes("--skip-accounts");
const SKIP_ANALYTICS = process.argv.includes("--skip-analytics");
const FRESH = process.argv.includes("--fresh");

const FILE_MAP_PATH = resolve(".migration-files.json");
const PROGRESS_PATH = resolve(".migration-progress.json");
// One file per run: passwords can't be recovered, so a later run must never overwrite an earlier one.
const CREDENTIALS_PATH = resolve(`migrated-credentials-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`);
const PT_EMAIL_DOMAIN = "parttime.babcockvotes.com";

// --- Firebase source ---------------------------------------------------------

/**
 * Find the service-account JSON. Order: `--firebase-key=<path>`, then
 * FIREBASE_SERVICE_ACCOUNT_KEY. dotenv only reads the first line of an
 * unquoted multi-line value (you'd get just "{"), so if that isn't valid JSON
 * we recover the whole block straight from .env.
 */
const loadServiceAccount = () => {
  const pathArg = process.argv.find((a) => a.startsWith("--firebase-key="));
  if (pathArg) {
    return JSON.parse(readFileSync(resolve(pathArg.split("=")[1]), "utf-8"));
  }

  const fromEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!fromEnv) {
    console.error(
      "Missing FIREBASE_SERVICE_ACCOUNT_KEY in .env (or pass --firebase-key=<path to json>).",
    );
    process.exit(1);
  }
  try {
    return JSON.parse(fromEnv);
  } catch {
    // fall through to the raw .env recovery below
  }

  const text = existsSync(resolve(".env")) ? readFileSync(resolve(".env"), "utf-8") : "";
  const start = text.indexOf("FIREBASE_SERVICE_ACCOUNT_KEY=");
  const open = start === -1 ? -1 : text.indexOf("{", start);
  const close = open === -1 ? -1 : text.indexOf("\n}", open);
  if (close !== -1) {
    try {
      return JSON.parse(text.slice(open, close + 2));
    } catch {
      // fall through to the error below
    }
  }

  console.error(
    "FIREBASE_SERVICE_ACCOUNT_KEY isn't valid JSON. Put it on one line inside single quotes,\n" +
      "or save the key file and pass --firebase-key=./service-account.json",
  );
  process.exit(1);
};

const serviceAccount = loadServiceAccount();
const firebase = initializeApp({ credential: cert(serviceAccount) });
const fsdb = getFirestore(firebase);
const fbStorage = getStorage(firebase);

console.log(
  `Source: Firebase project "${serviceAccount.project_id}"\n` +
    `Target: Convex ${CONVEX_URL}\n` +
    (DRY_RUN ? "DRY RUN: nothing will be written.\n" : ""),
);

// --- Helpers -----------------------------------------------------------------

/** Firestore Timestamp / Date / string / number -> milliseconds. */
const toMs = (value) => {
  if (!value) return null;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
};

const withId = (doc) => ({ id: doc.id, ...doc.data() });

/** Read a whole Firestore collection in pages (safe for the large `votes` collection). */
async function* readCollection(query, pageSize = 1000, startAfterId = null) {
  let last = startAfterId;
  while (true) {
    let page = query.orderBy("__name__").limit(pageSize);
    if (last) page = page.startAfter(last);
    const snap = await page.get();
    if (snap.empty) return;
    yield snap.docs;
    last = snap.docs[snap.docs.length - 1].id;
    if (snap.docs.length < pageSize) return;
  }
}

const readAll = async (query) => {
  const docs = [];
  for await (const page of readCollection(query)) docs.push(...page);
  return docs;
};

const report = [];
const note = (message) => {
  report.push(message);
  console.warn(`  ⚠ ${message}`);
};

// --- Progress (so a quota error doesn't cost a full re-read) ---------------------

const emptyProgress = () => ({
  steps: {},
  votes: { lastDocId: null, count: 0, inserted: 0, skipped: 0, unresolved: 0, tallies: {}, done: false },
});

const progress =
  FRESH || DRY_RUN || !existsSync(PROGRESS_PATH)
    ? emptyProgress()
    : JSON.parse(readFileSync(PROGRESS_PATH, "utf-8"));

const saveProgress = () => {
  if (!DRY_RUN) writeFileSync(PROGRESS_PATH, JSON.stringify(progress));
};

const isQuotaError = (err) =>
  err?.code === 8 || /RESOURCE_EXHAUSTED|Quota exceeded/i.test(String(err?.message ?? ""));

/** Send rows to a migration mutation in batches; returns the summed numeric counters. */
const send = async (name, rows, batchSize) => {
  const totals = {};
  const lists = {};
  if (DRY_RUN || rows.length === 0) return { totals, lists };

  for (const batch of chunk(rows, batchSize)) {
    const result = await ops.mutation(name, { rows: batch });
    for (const [key, value] of Object.entries(result)) {
      if (typeof value === "number") totals[key] = (totals[key] ?? 0) + value;
      else if (Array.isArray(value)) (lists[key] ??= []).push(...value);
    }
  }
  return { totals, lists };
};

// --- Files -------------------------------------------------------------------

const fileMap = existsSync(FILE_MAP_PATH) ? JSON.parse(readFileSync(FILE_MAP_PATH, "utf-8")) : {};

const FIREBASE_URL = /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/([^/]+)\/o\/([^?]+)/;
const CONTENT_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

/** Copy a Firebase Storage image into Convex file storage; returns its storageId (or undefined). */
const migrateFile = async (url) => {
  if (!url || SKIP_FILES) return undefined;
  const match = url.match(FIREBASE_URL);
  if (!match) {
    note(`Not a Firebase Storage URL, not copied: ${url.slice(0, 80)}`);
    return undefined;
  }
  if (fileMap[url]) return fileMap[url];
  if (DRY_RUN) return undefined;

  const [, bucketName, encodedPath] = match;
  const objectPath = decodeURIComponent(encodedPath);
  try {
    const file = fbStorage.bucket(bucketName).file(objectPath);
    const [buffer] = await file.download();
    const [metadata] = await file.getMetadata();
    const contentType =
      metadata.contentType || CONTENT_TYPES[extname(objectPath).toLowerCase()] || "application/octet-stream";

    const uploadUrl = await ops.mutation("migrationUploadUrl");
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: buffer,
    });
    if (!response.ok) throw new Error(`upload failed (${response.status})`);

    const { storageId } = await response.json();
    fileMap[url] = storageId;
    writeFileSync(FILE_MAP_PATH, JSON.stringify(fileMap, null, 2));
    return storageId;
  } catch (err) {
    note(`Could not copy ${objectPath}: ${err.message}`);
    return undefined;
  }
};

// --- 1. Users (profiles) -------------------------------------------------------

const migrateUsers = async () => {
  console.log("1/6 Users");
  const docs = await readAll(fsdb.collection("users"));
  const rows = [];

  for (const doc of docs) {
    const u = withId(doc);
    if (!u.email || !u.fullName || !u.matricNumber || !u.departmentId || !u.level) {
      note(`User ${u.id} (${u.email ?? "no email"}) has an incomplete profile; skipped`);
      continue;
    }
    rows.push({
      legacyId: u.id,
      email: u.email,
      name: u.fullName,
      fullName: u.fullName,
      matricNumber: u.matricNumber,
      departmentId: u.departmentId,
      level: u.level,
      role: ["voter", "dept_admin", "super_admin", "viewer"].includes(u.role) ? u.role : "voter",
      createdAt: toMs(u.createdAt) ?? Date.now(),
    });
  }

  const { totals } = await send("migrateUsers", rows, 100);
  console.log(`  ${rows.length} profiles (${totals.created ?? 0} created, ${totals.updated ?? 0} updated).\n`);
  return {
    count: rows.length,
    partTime: rows
      .filter((p) => p.email.toLowerCase().endsWith(`@${PT_EMAIL_DOMAIN}`))
      .map(({ email, fullName, matricNumber }) => ({ email, fullName, matricNumber })),
  };
};

// --- 2. Eligible voters ----------------------------------------------------------

const migrateEligibleVoters = async () => {
  console.log("2/6 Eligible voters");
  let count = 0;
  let unresolved = 0;

  for await (const docs of readCollection(fsdb.collection("eligible_voters"))) {
    const rows = docs.map((doc) => {
      const v = withId(doc);
      return {
        matricKey: v.id || matricToDocId(v.matricNumber ?? ""),
        fullName: v.fullName,
        departmentId: v.departmentId,
        level: v.level,
        ...(v.claimedByUid && { claimedByLegacyUid: v.claimedByUid }),
        ...(v.claimedEmail && { claimedEmail: v.claimedEmail }),
      };
    });
    const { lists } = await send("migrateEligibleVoters", rows, 100);
    unresolved += lists.unresolvedClaims?.length ?? 0;
    count += docs.length;
    process.stdout.write(`\r  ${count} eligible voters...`);
  }

  if (unresolved > 0) {
    note(`${unresolved} eligible voters were claimed by users without a migrated profile (claim left blank)`);
  }
  console.log(`\r  ${count} eligible voters.   \n`);
  return count;
};

// --- 3. Elections, positions, candidates -------------------------------------------

const migrateElections = async () => {
  console.log("3/6 Elections, positions, candidates");
  const electionDocs = await readAll(fsdb.collection("elections"));
  let positions = 0;
  let candidates = 0;

  for (const electionDoc of electionDocs) {
    const e = withId(electionDoc);
    const [positionDocs, candidateDocs] = await Promise.all([
      readAll(electionDoc.ref.collection("positions")),
      readAll(electionDoc.ref.collection("candidates")),
    ]);

    const startDate = toMs(e.startDate);
    const endDate = toMs(e.endDate);
    if (startDate === null || endDate === null) {
      note(`Election "${e.title}" (${e.id}) has no valid dates; skipped with its positions and candidates`);
      continue;
    }

    const electionRow = {
      legacyId: e.id,
      title: e.title,
      description: e.description ?? "",
      departmentId: e.departmentId,
      status: e.status,
      startDate,
      endDate,
      candidateCount: candidateDocs.length,
      createdAt: toMs(e.createdAt) ?? startDate,
      ...(e.createdBy && { createdByLegacyId: e.createdBy }),
      ...(e.isDuplicate && { isDuplicate: true }),
      ...(e.duplicatedFromElectionId && { duplicatedFromLegacyId: e.duplicatedFromElectionId }),
      ...(toMs(e.duplicatedAt) && { duplicatedAt: toMs(e.duplicatedAt) }),
      ...(e.duplicatedBy && { duplicatedByLegacyId: e.duplicatedBy }),
    };
    const logoStorageId = await migrateFile(e.logoUrl);
    if (logoStorageId) electionRow.logoStorageId = logoStorageId;

    const positionRows = positionDocs.map((doc) => {
      const p = withId(doc);
      return {
        legacyId: p.id,
        electionLegacyId: e.id,
        title: p.title,
        description: p.description ?? "",
        order: p.order ?? 0,
        allowedLevels: p.allowedLevels ?? [],
      };
    });

    const candidateRows = [];
    for (const doc of candidateDocs) {
      const c = withId(doc);
      const row = {
        legacyId: c.id,
        electionLegacyId: e.id,
        positionLegacyId: c.positionId,
        fullName: c.fullName,
        manifesto: c.manifesto ?? "",
        departmentId: c.departmentId ?? "",
        level: c.level ?? "",
      };
      const photoStorageId = await migrateFile(c.photoUrl);
      if (photoStorageId) row.photoStorageId = photoStorageId;
      candidateRows.push(row);
    }

    const elections = await send("migrateElections", [electionRow], 20);
    (elections.lists.notes ?? []).forEach(note);
    const posResult = await send("migratePositions", positionRows, 100);
    const candResult = await send("migrateCandidates", candidateRows, 50);
    for (const list of [posResult.lists.unresolved, candResult.lists.unresolved]) {
      if (list?.length) note(`${e.title}: ${list.length} rows reference a missing parent and were skipped`);
    }

    positions += positionRows.length;
    candidates += candidateRows.length;
    console.log(`  ${e.title}: ${positionRows.length} positions, ${candidateRows.length} candidates`);
  }

  console.log(`  ${electionDocs.length} elections.\n`);
  return { elections: electionDocs.length, positions, candidates, skippedFiles: SKIP_FILES };
};

// --- 4. Votes -----------------------------------------------------------------------

const migrateVotes = async () => {
  console.log("4/6 Votes");
  const state = progress.votes;
  if (state.done) {
    console.log(`  already migrated (${state.count} votes); use --fresh to redo.\n`);
    return state;
  }
  if (state.lastDocId) console.log(`  resuming after ${state.count} votes...`);

  const tallies = new Map(Object.entries(state.tallies)); // candidateId -> Firestore votes (abstains excluded)

  for await (const docs of readCollection(fsdb.collection("votes"), 500, state.lastDocId)) {
    const rows = docs.map((doc) => {
      const v = doc.data();
      if (v.candidateId !== "abstain") tallies.set(v.candidateId, (tallies.get(v.candidateId) ?? 0) + 1);
      return {
        electionLegacyId: v.electionId,
        positionLegacyId: v.positionId,
        candidateLegacyId: v.candidateId,
        voterLegacyId: v.voterId,
        votedAt: toMs(v.votedAt) ?? Date.now(),
      };
    });

    const { totals, lists } = await send("migrateVotes", rows, 200);
    state.inserted += totals.inserted ?? 0;
    state.skipped += totals.skipped ?? 0;
    state.unresolved += lists.unresolved?.length ?? 0;
    state.count += docs.length;
    state.lastDocId = docs[docs.length - 1].id;
    state.tallies = Object.fromEntries(tallies);
    saveProgress(); // only after the page is safely in Convex
    process.stdout.write(`\r  ${state.count} votes...`);
  }

  state.done = !DRY_RUN;
  saveProgress();

  if (state.unresolved > 0) {
    note(`${state.unresolved} votes reference a voter, election, position or candidate that doesn't exist in Convex and were skipped`);
  }
  console.log(
    `\r  ${state.count} votes (${state.inserted} inserted, ${state.skipped} already there, ${state.unresolved} unresolved).   \n`,
  );
  return state;
};

// --- 5. Part-time accounts ------------------------------------------------------------

const credentials = [];

const migrateAccounts = async (partTime) => {
  console.log("5/6 Part-time accounts");
  if (SKIP_ACCOUNTS || DRY_RUN) {
    console.log(`  ${partTime.length} part-time students (${DRY_RUN ? "dry run" : "skipped"}).\n`);
    return;
  }

  let created = 0;
  let existing = 0;
  for (const profile of partTime) {
    try {
      if (await ops.query("passwordAccountExists", { email: profile.email })) {
        existing++;
        continue;
      }
      const password = randomBytes(6).toString("base64url").slice(0, 8);
      await ops.action("createPasswordAccount", { email: profile.email, password });
      credentials.push({ fullName: profile.fullName, matricNumber: profile.matricNumber, email: profile.email, password });
      created++;
    } catch (err) {
      note(`Could not create an account for ${profile.email}: ${err.message.split("\n")[0]}`);
    }
  }
  console.log(`  ${created} accounts created, ${existing} already existed (passwords unchanged).\n`);
};

// --- 6. Verify ------------------------------------------------------------------------

const verify = async (expected, votes) => {
  console.log("6/6 Verifying");
  if (DRY_RUN) {
    console.log("  (dry run: Firebase counts only)");
    for (const [label, n] of Object.entries(expected)) console.log(`  ${label}: ${n}`);
    return 0;
  }

  let mismatches = 0;
  const check = (label, source, target) => {
    const ok = source === target;
    if (!ok) mismatches++;
    console.log(`  ${ok ? "✓" : "✗"} ${label}: firebase ${source} / convex ${target}`);
  };

  const convex = await ops.query("verifyCounts");

  // Votes are counted page by page: the total can outgrow a single transaction.
  let convexVotes = 0;
  let cursor = null;
  while (true) {
    const page = await ops.query("countVotesPage", { cursor });
    convexVotes += page.count;
    if (page.isDone) break;
    cursor = page.continueCursor;
  }
  check("users", expected.users, convex.users);
  check("eligible voters", expected.eligibleVoters, convex.eligibleVoters);
  check("elections", expected.elections, convex.elections);
  check("positions", expected.positions, convex.positions);
  check("candidates", expected.candidates, convex.candidates);
  check("votes", votes.count - votes.unresolved, convexVotes);

  // Per-candidate tallies must match exactly (this is what the results pages show).
  const candidateIds = Object.keys(votes.tallies);
  let bad = 0;
  for (const group of chunk(candidateIds, 50)) {
    const convexTallies = await ops.query("tallyByLegacy", { candidateLegacyIds: group });
    for (const id of group) {
      if (convexTallies[id] !== votes.tallies[id]) {
        bad++;
        console.log(`  ✗ candidate ${id}: firebase ${votes.tallies[id]} / convex ${convexTallies[id]}`);
      }
    }
  }
  if (bad === 0) console.log(`  ✓ vote tallies match for all ${candidateIds.length} candidates with votes`);
  return mismatches + bad;
};

// --- Preflight --------------------------------------------------------------------------

// Fail fast if this key's project has no data at all (usually the wrong Firebase project).
const probes = await Promise.all(
  ["users", "eligible_voters", "elections", "votes"].map((name) => fsdb.collection(name).limit(1).get()),
);
if (probes.every((snap) => snap.empty)) {
  console.error(
    `The Firebase project "${serviceAccount.project_id}" has no users, voters, elections or votes.\n` +
      "You're almost certainly using the service-account key of the wrong Firebase project.\n" +
      "Generate one for the project that holds the real data (Project settings -> Service accounts),\n" +
      "then put it in .env or pass --firebase-key=<file>.",
  );
  process.exit(1);
}

// --- Run --------------------------------------------------------------------------------

/** Run a step once; a later run reuses its saved result instead of re-reading Firebase. */
const step = async (name, run, redoIf = () => false) => {
  if (progress.steps[name] && !redoIf(progress.steps[name])) {
    console.log(`${name}: done in an earlier run (use --fresh to redo)\n`);
    return progress.steps[name];
  }
  const result = await run();
  progress.steps[name] = result;
  saveProgress();
  return result;
};

let mismatches = 0;
try {
  const users = await step("users", migrateUsers);
  const eligible = await step("eligible voters", async () => ({ count: await migrateEligibleVoters() }));
  // Redo the elections step if it earlier ran without images and images are wanted now.
  const structure = await step(
    "elections",
    migrateElections,
    (saved) => saved.skippedFiles && !SKIP_FILES,
  );
  const votes = await migrateVotes();
  await migrateAccounts(users.partTime);

  mismatches = await verify(
    {
      users: users.count,
      eligibleVoters: eligible.count,
      elections: structure.elections,
      positions: structure.positions,
      candidates: structure.candidates,
    },
    votes,
  );
} catch (err) {
  if (!isQuotaError(err)) throw err;
  console.error(
    "\n\nFirestore's read quota is used up (free tier: ~50,000 reads/day).\n" +
      "Progress is saved: run the same command again after the quota resets (around midnight Pacific),\n" +
      "or enable billing on the Firebase project to lift the limit. Nothing needs to be redone.",
  );
  process.exit(2);
}

if (!DRY_RUN && !SKIP_ANALYTICS) {
  console.log("\nGenerating analytics summaries...");
  const result = await ops.action("generateAllAnalytics");
  console.log(`  ${result.elections} elections, ${result.voteRecords} vote records.`);
}

if (credentials.length > 0) {
  writeFileSync(
    CREDENTIALS_PATH,
    [
      "fullName,matricNumber,email,password",
      ...credentials.map((c) => `${c.fullName},${c.matricNumber},${c.email},${c.password}`),
    ].join("\n"),
  );
  console.log(`\nNew passwords for ${credentials.length} part-time accounts written to ${CREDENTIALS_PATH}`);
}

if (report.length > 0) {
  console.log(`\n${report.length} warning(s):`);
  report.forEach((line) => console.log(`  - ${line}`));
}

console.log(
  mismatches === 0
    ? `\n${DRY_RUN ? "Dry run complete." : "Migration complete: all counts match."}`
    : `\nMigration finished with ${mismatches} mismatch(es). Do NOT cut over until resolved.`,
);
process.exit(mismatches === 0 ? 0 : 1);
