/**
 * Seed positions and candidates for an election from a CSV file.
 *
 * CSV format (with header row):
 *   position,display_order,candidate_name,department_id,level
 *
 * Usage:
 *   node scripts/seed-candidates.mjs <election-id> <csv-path>
 *
 * The election ID is the Convex document ID shown in the admin URL
 * (/admin/elections/<id>).
 *
 * Idempotent:
 *   - Positions are matched by title (case-insensitive). Existing ones are reused.
 *   - Candidates are matched by name + position. Duplicates are skipped.
 *   - Safe to re-run with the same CSV.
 */

import { chunk, ops, readCsv } from "./lib/convex.mjs";

const electionId = process.argv[2];
const csvPath = process.argv[3];

if (!electionId || !csvPath) {
  console.error("Usage: node scripts/seed-candidates.mjs <election-id> <csv-path>");
  process.exit(1);
}

const rows = (
  await readCsv(csvPath, ["position", "display_order", "candidate_name", "department_id", "level"])
)
  .filter((row) => {
    if (!row.candidate_name) console.log("  ! Skipping row with empty candidate_name");
    return row.candidate_name;
  })
  .map((row) => ({
    position: row.position,
    order: parseInt(row.display_order) || 0,
    candidateName: row.candidate_name,
    departmentId: row.department_id || "",
    level: row.level || "",
  }));

console.log(`Parsed ${rows.length} rows from CSV.\n`);

let positionsCreated = 0;
let candidatesCreated = 0;
let candidatesSkipped = 0;
let title = "";

try {
  for (const batch of chunk(rows, 100)) {
    const result = await ops.mutation("seedCandidates", { electionId, rows: batch });
    title = result.title;
    positionsCreated += result.positionsCreated;
    candidatesCreated += result.candidatesCreated;
    candidatesSkipped += result.candidatesSkipped;
  }
} catch (err) {
  console.error(`✗ ${err.message}`);
  process.exit(1);
}

console.log(`Election: ${title}`);
console.log(
  `\nDone! ${positionsCreated} positions created, ${candidatesCreated} candidates added, ${candidatesSkipped} duplicates skipped.`,
);
process.exit(0);
