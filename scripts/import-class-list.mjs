/**
 * Import a class list spreadsheet (.xlsx) as registered users.
 *
 * Reads the first sheet. The header row is found by its "Surname" and
 * "Matric" cells; "Other names", "Personal Email address" and "Phone number"
 * are picked up by label too. Every row gets the department and level given
 * on the command line. Each student becomes a registered voter in `users`
 * (through `ops.importClassList`; no eligible-voter rows) whose email is the
 * personal email on the list, which is where their sign-in code is sent.
 *
 * Usage:
 *   node scripts/import-class-list.mjs "600L class list.xlsx" --department medicine --level 600
 *
 * Environment (.env.local): NEXT_PUBLIC_CONVEX_URL, OPS_SECRET
 *
 * Re-running is safe: a matric number that already has a user updates that
 * user (profile, email, phone) instead of creating a second one.
 */

import ExcelJS from "exceljs";
import { chunk, ops } from "./lib/convex.mjs";
import { cellText, findColumns, mapClassListRow } from "./lib/classList.mjs";

const usage = () => {
  console.error(
    'Usage: node scripts/import-class-list.mjs <xlsx> --department <id> --level <level>\n' +
      'e.g.   node scripts/import-class-list.mjs "600L class list.xlsx" --department medicine --level 600',
  );
  process.exit(1);
};

const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? undefined : args[index + 1];
};
const path = args[0];
const departmentId = option("department");
const level = option("level");
if (!path || path.startsWith("--") || !departmentId || !level) usage();

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(path);
const sheet = workbook.worksheets[0];
if (!sheet) {
  console.error("The workbook has no sheets.");
  process.exit(1);
}

// exceljs row values are 1-indexed; drop the empty slot 0.
const rows = [];
sheet.eachRow({ includeEmpty: true }, (row) => {
  rows.push(row.values.slice(1).map(cellText));
});

const found = findColumns(rows);
if (!found) {
  console.error('Could not find a header row with "Surname" and "Matric" columns.');
  process.exit(1);
}
const { headerIndex, columns } = found;
if (columns.personalEmail === -1) {
  console.error('Could not find a "Personal Email address" column.');
  process.exit(1);
}

const toWrite = [];
const skipped = [];
const seen = new Map();
for (const [offset, row] of rows.slice(headerIndex + 1).entries()) {
  const line = headerIndex + offset + 2; // spreadsheet row number
  if (row.every((cell) => !cell.trim())) continue;

  const mapped = mapClassListRow(row, columns, { departmentId, level });
  if ("error" in mapped) {
    skipped.push(`row ${line}: ${mapped.error}`);
    continue;
  }
  const key = mapped.matricNumber.toLowerCase();
  if (seen.has(key)) {
    skipped.push(
      `row ${line}: duplicate matric ${mapped.matricNumber} (first seen on row ${seen.get(key)})`,
    );
    continue;
  }
  seen.set(key, line);
  toWrite.push(mapped);
}

console.log(`Sheet "${sheet.name}": ${toWrite.length} valid rows, ${skipped.length} skipped.`);
skipped.forEach((reason) => console.log(`  ⚠ Skipping ${reason}`));

let created = 0;
let updated = 0;
let failed = 0;
for (const [index, batch] of chunk(toWrite, 100).entries()) {
  const result = await ops.mutation("importClassList", { rows: batch });
  created += result.created;
  updated += result.updated;
  failed += result.failed.length;
  result.failed.forEach(({ matricNumber, reason }) => console.log(`  ✗ ${matricNumber}: ${reason}`));
  console.log(
    `  Batch ${index + 1}: ${result.created} created, ${result.updated} updated, ${result.failed.length} failed`,
  );
}

console.log(
  `\nDone! ${created} created, ${updated} updated, ${failed} failed, ${skipped.length} skipped (invalid in file).`,
);
process.exit(failed || skipped.length ? 1 : 0);
