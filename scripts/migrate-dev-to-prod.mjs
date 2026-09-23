/**
 * Copy registered users, eligible voters, elections, positions, candidates,
 * and their images from one deployment to another,
 * by default dev (.env.local) to production (.env.prod).
 *
 * Users are matched by matric number, then email, and created or updated;
 * eligible voters are matched by matric key, and their claim points at the
 * matching user on the target. Nothing on the target is deleted. Sign-in
 * accounts aren't copied: voter codes and Google sign-ins attach to the
 * copied users on first use, but part-time password accounts must be
 * recreated with create-pt-accounts.mjs.
 *
 * Usage:
 *   node scripts/migrate-dev-to-prod.mjs            # dry run: read and report
 *   node scripts/migrate-dev-to-prod.mjs --yes      # write to the target
 *   node scripts/migrate-dev-to-prod.mjs --from .env.local --to .env.prod --yes
 *
 * Each env file needs NEXT_PUBLIC_CONVEX_URL and that deployment's
 * OPS_SECRET. Deploy the current convex/ functions to both first
 * (`npx convex deploy` for production).
 *
 * Re-running is safe: every write is an upsert.
 */

import { readFileSync } from "fs";
import { parse } from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : args[index + 1];
};
const WRITE = args.includes("--yes");

/** A client for the deployment in an env file, with its OPS_SECRET filled in. */
const deployment = (path) => {
  let env;
  try {
    env = parse(readFileSync(path));
  } catch {
    console.error(`Can't read ${path}.`);
    process.exit(1);
  }
  const url = env.NEXT_PUBLIC_CONVEX_URL;
  const secret = env.OPS_SECRET;
  if (!url || !secret) {
    console.error(`${path} needs NEXT_PUBLIC_CONVEX_URL and OPS_SECRET.`);
    process.exit(1);
  }
  const client = new ConvexHttpClient(url);
  return {
    url,
    query: (name, fnArgs) => client.query(anyApi.ops[name], { secret, ...fnArgs }),
    mutation: (name, fnArgs) => client.mutation(anyApi.ops[name], { secret, ...fnArgs }),
  };
};

const chunk = (items, size) => {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

/** Every row of a paged `ops` export query. */
const readAll = async (source, name) => {
  const rows = [];
  let skipped = 0;
  let cursor = null;
  for (;;) {
    const page = await source.query(name, { cursor });
    rows.push(...page.rows);
    skipped += page.skipped ?? 0;
    if (page.isDone) return { rows, skipped };
    cursor = page.continueCursor;
  }
};

const from = deployment(option("from", ".env.local"));
const to = deployment(option("to", ".env.prod"));
if (from.url === to.url) {
  console.error(`Source and target are the same deployment (${from.url}).`);
  process.exit(1);
}
console.log(`From: ${from.url}\nTo:   ${to.url}\n`);

const users = await readAll(from, "exportUsersPage");
const voters = await readAll(from, "exportEligibleVotersPage");
const [elections, positions, candidates] = await Promise.all([
  readAll(from, "exportElectionsPage"),
  readAll(from, "exportPositionsPage"),
  readAll(from, "exportCandidatesPage"),
]);
console.log(
  `Read ${users.rows.length} registered users (${users.skipped} unregistered skipped) ` +
    `and ${voters.rows.length} eligible voters.\n` +
    `Read ${elections.rows.length} elections, ${positions.rows.length} positions, ` +
  `${candidates.rows.length} candidates.`,
);

if (!WRITE) {
  console.log("\nDry run: nothing written. Re-run with --yes to copy them to the target.");
  process.exit(0);
}

try {
  await to.query("verifyCounts", {});
} catch (error) {
  throw new Error(
    `Cannot access the target deployment. Check that .env.prod has the correct ` +
    `OPS_SECRET and that the current Convex functions are deployed there. ` +
    `Original error: ${error.message}`,
  );
}

// Storage IDs are deployment-specific. Download each source image through its
// resolved URL and upload it into the target deployment before writing rows.
let imageFailures = 0;
const copyImage = async (url, label) => {
  if (!url) return undefined;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`download failed (${response.status})`);
    const uploadUrl = await to.mutation("migrationUploadUrl", {});
    const upload = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": response.headers.get("content-type") ?? "application/octet-stream" },
      body: await response.arrayBuffer(),
    });
    if (!upload.ok) throw new Error(`upload failed (${upload.status})`);
    return (await upload.json()).storageId;
  } catch (error) {
    imageFailures++;
    console.log(`  ✗ ${label}: ${error.message}`);
    return undefined;
  }
};

for (const row of elections.rows) {
  row.logoStorageId = await copyImage(row.logoUrl, `election ${row.title} logo`);
}
for (const row of candidates.rows) {
  row.photoStorageId = await copyImage(row.photoUrl, `candidate ${row.fullName} photo`);
}

// Users first, so eligible-voter claims can find them.
let failed = 0;
const totals = { users: { created: 0, updated: 0 }, voters: { created: 0, updated: 0 } };
for (const batch of chunk(users.rows, 100)) {
  const result = await to.mutation("upsertUsers", { rows: batch });
  totals.users.created += result.created;
  totals.users.updated += result.updated;
  failed += result.failed.length;
  result.failed.forEach(({ matricNumber, reason }) =>
    console.log(`  ✗ ${matricNumber}: ${reason}`),
  );
}
console.log(
  `Users: ${totals.users.created} created, ${totals.users.updated} updated, ${failed} failed.`,
);

const unresolved = [];
for (const batch of chunk(voters.rows, 100)) {
  const result = await to.mutation("upsertEligibleVoters", { rows: batch });
  totals.voters.created += result.created;
  totals.voters.updated += result.updated;
  unresolved.push(...result.unresolvedClaims);
}
unresolved.forEach((matricKey) =>
  console.log(`  ⚠ ${matricKey}: claimant not found on the target`),
);
console.log(
  `Eligible voters: ${totals.voters.created} created, ${totals.voters.updated} updated, ` +
    `${unresolved.length} claims unresolved.`,
);

let migrationFailed = 0;
const electionRows = elections.rows.map(({ logoUrl, ...row }) => row);
const candidateRows = candidates.rows.map(({ photoUrl, ...row }) => row);
const electionResult = await to.mutation("upsertElections", { rows: electionRows });
migrationFailed += electionResult.unresolved.length;
console.log(
  `Elections: ${electionResult.created} created, ${electionResult.updated} updated, ` +
    `${electionResult.unresolved.length} unresolved.`,
);

const positionResult = await to.mutation("upsertPositions", { rows: positions.rows });
migrationFailed += positionResult.unresolved.length;
console.log(
  `Positions: ${positionResult.created} created, ${positionResult.updated} updated, ` +
    `${positionResult.unresolved.length} unresolved.`,
);

const candidateResult = await to.mutation("upsertCandidates", { rows: candidateRows });
migrationFailed += candidateResult.unresolved.length;
console.log(
  `Candidates: ${candidateResult.created} created, ${candidateResult.updated} updated, ` +
    `${candidateResult.unresolved.length} unresolved.`,
);

process.exit(failed || unresolved.length || migrationFailed || imageFailures ? 1 : 0);
