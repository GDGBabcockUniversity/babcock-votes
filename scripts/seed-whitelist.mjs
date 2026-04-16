/**
 * Seed the eligible_voters collection from a CSV file.
 *
 * CSV format (with header row):
 *   fullName,matricNumber,departmentId,level
 *
 * Usage:
 *   node scripts/seed-whitelist.mjs ./data/eligible_voters.csv ./service-account-key.json
 *
 * Environment:
 *   GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json
 *   (or pass as second argument)
 *
 * Duplicate handling:
 *   If a document with the same matric number already exists,
 *   it is skipped (not overwritten) and logged.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// --- Config ---
const csvPath = process.argv[2];
const keyPath = process.argv[3] || process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!csvPath) {
  console.error(
    "Usage: node scripts/seed-whitelist.mjs <csv-path> [service-account-key-path]",
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

// --- Parse CSV ---
const raw = readFileSync(resolve(csvPath), "utf-8").trim();
const lines = raw.split(/\r?\n/);
const header = lines[0].split(",").map((h) => h.trim());

const required = ["fullName", "matricNumber", "departmentId", "level"];
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

// --- Seed in batches of 500, skipping existing docs ---
const BATCH_SIZE = 500;
let written = 0;
let skippedNoMatric = 0;
let skippedExists = 0;
let skippedDuplicateInCsv = 0;

const seenMatrics = new Set();

for (let i = 0; i < rows.length; i += BATCH_SIZE) {
  const chunk = rows.slice(i, i + BATCH_SIZE);
  const batch = db.batch();
  let batchCount = 0;

  for (const row of chunk) {
    const matric = row.matricNumber;
    if (!matric) {
      skippedNoMatric++;
      continue;
    }

    // Replace / with - for Firestore doc ID
    const docId = matric.replace(/\//g, "-").toLowerCase();

    if (seenMatrics.has(docId)) {
      console.log(`  ⚠ Skipping ${docId} (duplicate in CSV): ${row.fullName}`);
      skippedDuplicateInCsv++;
      continue;
    }
    seenMatrics.add(docId);

    const ref = db.collection("eligible_voters").doc(docId);

    // Check if doc already exists
    const existing = await ref.get();
    if (existing.exists) {
      console.log(`  ⚠ Skipping ${docId} (already exists): ${row.fullName}`);
      skippedExists++;
      continue;
    }

    batch.set(ref, {
      fullName: row.fullName,
      departmentId: row.departmentId,
      level: row.level,
    });

    batchCount++;
    written++;
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  const batchNum = Math.floor(i / BATCH_SIZE) + 1;
  console.log(
    `  Batch ${batchNum}: ${batchCount} written, ${chunk.length - batchCount} skipped`,
  );
}

console.log(
  `\nDone! ${written} written, ${skippedExists} skipped (already exist in DB), ${skippedDuplicateInCsv} skipped (duplicate in CSV), ${skippedNoMatric} skipped (no matric).`,
);
process.exit(0);
