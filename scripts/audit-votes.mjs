/**
 * Audit every vote for a given election.
 *
 * For each vote, outputs: voter name, voter email, position title,
 * candidate name (or "ABSTAIN"), and the timestamp.
 *
 * Usage:
 *   node scripts/audit-votes.mjs <electionId> [service-account-key-path]
 *
 * Output:
 *   Writes a CSV to ./audit-<electionId>.csv
 */

import { writeFileSync } from "fs";
import { readFileSync } from "fs";
import { resolve } from "path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// --- Args ---
const electionId = process.argv[2];
const keyPath =
  process.argv[3] || process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!electionId) {
  console.error(
    "Usage: node scripts/audit-votes.mjs <electionId> [service-account-key-path]",
  );
  process.exit(1);
}

if (!keyPath) {
  console.error(
    "Provide a service account key via GOOGLE_APPLICATION_CREDENTIALS or as the second argument.",
  );
  process.exit(1);
}

// --- Init Firebase Admin ---
const serviceAccount = JSON.parse(readFileSync(resolve(keyPath), "utf-8"));
const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

console.log(`Auditing votes for election: ${electionId}\n`);

// --- Fetch election ---
const elSnap = await db.collection("elections").doc(electionId).get();
if (!elSnap.exists) {
  console.error("Election not found.");
  process.exit(1);
}
const election = elSnap.data();
console.log(`Election: ${election.title}`);

// --- Fetch positions & candidates (subcollections) ---
const [posSnap, candSnap] = await Promise.all([
  db
    .collection("elections")
    .doc(electionId)
    .collection("positions")
    .orderBy("order", "asc")
    .get(),
  db
    .collection("elections")
    .doc(electionId)
    .collection("candidates")
    .get(),
]);

const positionMap = new Map();
posSnap.docs.forEach((d) => positionMap.set(d.id, d.data()));

const candidateMap = new Map();
candSnap.docs.forEach((d) => candidateMap.set(d.id, d.data()));

console.log(
  `Loaded ${positionMap.size} positions, ${candidateMap.size} candidates.`,
);

// --- Fetch all votes for this election ---
const votesSnap = await db
  .collection("votes")
  .where("electionId", "==", electionId)
  .get();

console.log(`Found ${votesSnap.size} vote records.\n`);

if (votesSnap.size === 0) {
  console.log("No votes to audit.");
  process.exit(0);
}

// --- Collect unique voter IDs and batch-fetch user profiles ---
const voterIds = [...new Set(votesSnap.docs.map((d) => d.data().voterId))];
console.log(`Fetching profiles for ${voterIds.length} unique voters...`);

const userMap = new Map();
const BATCH = 30; // Firestore "in" queries support up to 30 IDs
for (let i = 0; i < voterIds.length; i += BATCH) {
  const chunk = voterIds.slice(i, i + BATCH);
  const snap = await db
    .collection("users")
    .where("__name__", "in", chunk)
    .get();
  snap.docs.forEach((d) => userMap.set(d.id, d.data()));
}

console.log(`Resolved ${userMap.size} user profiles.\n`);

// --- Build rows ---
const escCsv = (val) => {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

const header = [
  "voter_name",
  "voter_email",
  "voter_matric",
  "position",
  "candidate_voted_for",
  "voted_at",
];

const rows = votesSnap.docs.map((d) => {
  const v = d.data();
  const user = userMap.get(v.voterId);
  const position = positionMap.get(v.positionId);
  const candidate =
    v.candidateId === "abstain" ? null : candidateMap.get(v.candidateId);

  const votedAt = v.votedAt?.toDate?.()
    ? v.votedAt.toDate().toISOString()
    : "";

  return [
    escCsv(user?.fullName ?? "UNKNOWN"),
    escCsv(user?.email ?? "UNKNOWN"),
    escCsv(user?.matricNumber ?? ""),
    escCsv(position?.title ?? v.positionId),
    escCsv(candidate ? candidate.fullName : "ABSTAIN"),
    escCsv(votedAt),
  ].join(",");
});

// Sort by voter email then position for easy scanning
rows.sort();

const csv = [header.join(","), ...rows].join("\n");
const outPath = resolve(`audit-${electionId}.csv`);
writeFileSync(outPath, csv, "utf-8");

console.log(`Written ${rows.length} rows to ${outPath}`);

// --- Quick summary: flag non-school emails ---
const schoolDomain = "babcock.edu.ng";
const nonSchool = [];
for (const [uid, user] of userMap) {
  if (user.email && !user.email.endsWith(`@${schoolDomain}`)) {
    nonSchool.push({ uid, email: user.email, fullName: user.fullName });
  }
}

if (nonSchool.length > 0) {
  console.log(
    `\n⚠ ${nonSchool.length} voter(s) used non-school emails:\n`,
  );
  nonSchool.forEach((u) =>
    console.log(`  ${u.fullName} — ${u.email} (uid: ${u.uid})`),
  );
} else {
  console.log("\n✓ All voters used school emails.");
}

process.exit(0);
