/**
 * Create sign-in accounts for part-time students and fully provision their
 * profiles so they can log in and vote immediately.
 *
 * For each student this script:
 *   1. Creates an email/password account with a fabricated email and a random
 *      password (email marked verified)
 *   2. Claims their eligible-voter (whitelist) row
 *   3. Fills in their profile (same as registration does)
 *   4. Writes the credentials to an output CSV for distribution
 *
 * Prerequisites:
 *   - The students MUST already be in the whitelist
 *     (run seed-whitelist.mjs first with the same CSV)
 *
 * CSV format (with header row):
 *   fullName,matricNumber,departmentId,level
 *
 * Usage:
 *   node scripts/create-pt-accounts.mjs <csv-path>
 *
 * Environment (.env.local): NEXT_PUBLIC_CONVEX_URL, OPS_SECRET
 */

import { randomBytes } from "crypto";
import { writeFileSync } from "fs";
import { resolve } from "path";
import { matricToDocId, ops, readCsv } from "./lib/convex.mjs";

const PT_EMAIL_DOMAIN = "parttime.babcockvotes.com";

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Usage: node scripts/create-pt-accounts.mjs <csv-path>");
  process.exit(1);
}

const rows = await readCsv(csvPath, ["fullName", "matricNumber", "departmentId", "level"]);
console.log(`Parsed ${rows.length} part-time students from CSV.\n`);

// 8-char alphanumeric password
const generatePassword = () => randomBytes(6).toString("base64url").slice(0, 8);

const credentials = [];
let created = 0;
let skipped = 0;
let errors = 0;

for (const row of rows) {
  const matric = row.matricNumber;
  if (!matric) {
    console.log(`  ⚠ Skipping row with no matric number: ${row.fullName}`);
    continue;
  }

  const email = `${matricToDocId(matric)}@${PT_EMAIL_DOMAIN}`;
  const password = generatePassword();

  try {
    await ops.action("createPartTimeAccount", {
      email,
      password,
      matricNumber: matric,
      fullName: row.fullName,
      departmentId: row.departmentId,
      level: row.level,
    });
    credentials.push({ fullName: row.fullName, matricNumber: matric, email, password });
    created++;
    console.log(`  ✓ ${matric} → ${email}`);
  } catch (err) {
    // Not in the whitelist, already claimed, or the account already exists.
    const message = err.message.split("\n")[0];
    if (/not in the whitelist|already claimed|already exists/i.test(message)) {
      console.log(`  ⚠ Skipping ${matric} — ${message}`);
      skipped++;
    } else {
      console.error(`  ✗ Failed for ${matric}: ${message}`);
      errors++;
    }
  }
}

if (credentials.length > 0) {
  const csv = [
    "fullName,matricNumber,email,password",
    ...credentials.map((c) => `${c.fullName},${c.matricNumber},${c.email},${c.password}`),
  ].join("\n");
  const outputPath = resolve("pt-credentials.csv");
  writeFileSync(outputPath, csv, "utf-8");
  console.log(`\nCredentials written to: ${outputPath}`);
}

console.log(`\nDone! ${created} created, ${skipped} skipped, ${errors} errors.`);
process.exit(0);
