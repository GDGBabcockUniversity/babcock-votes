/**
 * Seed positions and candidates for an election from a CSV file.
 *
 * CSV format (with header row):
 *   position,display_order,candidate_name,department_id,level
 *
 * Usage:
 *   node scripts/seed-candidates.mjs <election-id> <csv-path> [service-account-key-path]
 *
 * Example:
 *   node scripts/seed-candidates.mjs abc123 ./data/candidates.csv ./service-account-key.json
 *
 * Idempotent:
 *   - Positions are matched by title (case-insensitive). Existing ones are reused.
 *   - Candidates are matched by name + position. Duplicates are skipped.
 *   - Safe to re-run with the same CSV.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// --- Args ---
const electionId = process.argv[2];
const csvPath = process.argv[3];
const keyPath = process.argv[4] || process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!electionId || !csvPath) {
  console.error(
    "Usage: node scripts/seed-candidates.mjs <election-id> <csv-path> [service-account-key-path]",
  );
  process.exit(1);
}

if (!keyPath) {
  console.error(
    "Provide a service account key via GOOGLE_APPLICATION_CREDENTIALS or as the third argument.",
  );
  process.exit(1);
}

// --- Init Firebase Admin ---
const serviceAccount = JSON.parse(readFileSync(resolve(keyPath), "utf-8"));
const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

// --- Verify election exists ---
const elRef = db.collection("elections").doc(electionId);
const elSnap = await elRef.get();
if (!elSnap.exists) {
  console.error(`Election "${electionId}" not found.`);
  process.exit(1);
}
console.log(`Election: ${elSnap.data().title}\n`);

// --- Parse CSV ---
const raw = readFileSync(resolve(csvPath), "utf-8").trim();
const lines = raw.split(/\r?\n/);
const header = lines[0].split(",").map((h) => h.trim());

const required = ["position", "display_order", "candidate_name", "department_id", "level"];
for (const col of required) {
  if (!header.includes(col)) {
    console.error(
      `Missing required column: "${col}". Found: ${header.join(", ")}`,
    );
    process.exit(1);
  }
}

const rows = lines.slice(1).map((line) => {
  const values = line.split(",").map((v) => v.trim());
  const obj = {};
  header.forEach((col, i) => {
    obj[col] = values[i] || "";
  });
  return obj;
});

console.log(`Parsed ${rows.length} rows from CSV.\n`);

// --- Load existing positions ---
const posSnap = await elRef.collection("positions").orderBy("order").get();
const positionsByTitle = new Map();
posSnap.docs.forEach((d) => {
  positionsByTitle.set(d.data().title.toLowerCase(), d.id);
});

// --- Load existing candidates ---
const candSnap = await elRef.collection("candidates").get();
const existingCandidates = candSnap.docs.map((d) => ({
  fullName: d.data().fullName.toLowerCase(),
  positionId: d.data().positionId,
}));

// --- Collect unique positions from CSV ---
const uniquePositions = new Map();
for (const row of rows) {
  const key = row.position.toLowerCase();
  if (!uniquePositions.has(key)) {
    uniquePositions.set(key, {
      title: row.position,
      order: parseInt(row.display_order) || 0,
    });
  }
}

// --- Create missing positions ---
let positionsCreated = 0;
for (const [titleLower, { title, order }] of uniquePositions) {
  if (!positionsByTitle.has(titleLower)) {
    const docRef = await elRef.collection("positions").add({
      title,
      description: "",
      order,
      allowedLevels: [],
    });
    positionsByTitle.set(titleLower, docRef.id);
    positionsCreated++;
    console.log(`  + Position created: ${title}`);
  } else {
    console.log(`  = Position exists: ${title}`);
  }
}

// --- Create missing candidates ---
let candidatesCreated = 0;
let candidatesSkipped = 0;

for (const row of rows) {
  const posId = positionsByTitle.get(row.position.toLowerCase());
  const name = row.candidate_name;

  if (!name) {
    console.log(`  ! Skipping row with empty candidate_name`);
    continue;
  }

  const alreadyExists = existingCandidates.some(
    (c) => c.positionId === posId && c.fullName === name.toLowerCase(),
  );

  if (alreadyExists) {
    console.log(`  = Skipping (exists): ${name} for ${row.position}`);
    candidatesSkipped++;
    continue;
  }

  await elRef.collection("candidates").add({
    fullName: name,
    manifesto: "",
    departmentId: row.department_id || "",
    level: row.level || "",
    positionId: posId,
    photoUrl: "",
    voteCount: 0,
  });

  candidatesCreated++;
  console.log(`  + Candidate added: ${name} -> ${row.position}`);
}

// --- Update election candidateCount ---
if (candidatesCreated > 0) {
  await elRef.update({
    candidateCount: FieldValue.increment(candidatesCreated),
  });
}

console.log(
  `\nDone! ${positionsCreated} positions created, ${candidatesCreated} candidates added, ${candidatesSkipped} duplicates skipped.`,
);
process.exit(0);
