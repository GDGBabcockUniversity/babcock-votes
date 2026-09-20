/**
 * Seed the eligible voters table from a CSV file.
 *
 * CSV format (with header row):
 *   fullName,matricNumber,departmentId,level
 *
 * Usage:
 *   node scripts/seed-whitelist.mjs ./data/eligible_voters.csv
 *
 * Environment (.env.local): NEXT_PUBLIC_CONVEX_URL, OPS_SECRET
 *
 * Duplicate handling:
 *   If a voter with the same matric number already exists,
 *   it is skipped (not overwritten) and logged.
 */

import { chunk, matricToDocId, ops, readCsv } from "./lib/convex.mjs";

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Usage: node scripts/seed-whitelist.mjs <csv-path>");
  process.exit(1);
}

const rows = await readCsv(csvPath, ["fullName", "matricNumber", "departmentId", "level"]);
console.log(`Parsed ${rows.length} rows from CSV.\n`);

let written = 0;
let skippedNoMatric = 0;
let skippedExists = 0;
let skippedDuplicateInCsv = 0;

const seen = new Set();
const toWrite = [];
for (const row of rows) {
  if (!row.matricNumber) {
    skippedNoMatric++;
    continue;
  }
  const key = matricToDocId(row.matricNumber);
  if (seen.has(key)) {
    console.log(`  ⚠ Skipping ${key} (duplicate in CSV): ${row.fullName}`);
    skippedDuplicateInCsv++;
    continue;
  }
  seen.add(key);
  toWrite.push({
    matric: row.matricNumber,
    fullName: row.fullName,
    departmentId: row.departmentId,
    level: row.level,
  });
}

for (const [index, batch] of chunk(toWrite, 100).entries()) {
  const result = await ops.mutation("seedEligibleVoters", { rows: batch });
  written += result.written;
  skippedExists += result.existing.length;
  result.existing.forEach((key) => console.log(`  ⚠ Skipping ${key} (already exists)`));
  console.log(
    `  Batch ${index + 1}: ${result.written} written, ${result.existing.length} skipped`,
  );
}

console.log(
  `\nDone! ${written} written, ${skippedExists} skipped (already exist), ${skippedDuplicateInCsv} skipped (duplicate in CSV), ${skippedNoMatric} skipped (no matric).`,
);
process.exit(0);
