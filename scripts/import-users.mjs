/**
 * Import registered users from a JSON file.
 *
 * Each user is created already registered and claims the eligible-voter row
 * for their matric (the row is created if it doesn't exist), so they can sign
 * in straight away with matric number (or email) + full name.
 *
 * JSON format: an array of objects
 *   [
 *     {
 *       "fullName": "Ada Obi",
 *       "matricNumber": "21/0456",
 *       "departmentId": "computer_science",
 *       "level": "300",
 *       "email": "ada@student.babcock.edu.ng",   // optional
 *       "role": "voter"                          // optional: voter | viewer | dept_admin | super_admin
 *     }
 *   ]
 * See scripts/users.example.json.
 *
 * Usage:
 *   node scripts/import-users.mjs ./data/users.json
 *
 * Environment (.env.local): NEXT_PUBLIC_CONVEX_URL, OPS_SECRET
 *
 * Re-running is safe: a matric or email that already has a user updates that
 * user instead of creating a second one. Without "role", existing users keep
 * theirs and new users become voters.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { chunk, matricToDocId, ops } from "./lib/convex.mjs";

const REQUIRED = ["fullName", "matricNumber", "departmentId", "level"];
const ROLES = ["voter", "viewer", "dept_admin", "super_admin"];

const jsonPath = process.argv[2];
if (!jsonPath) {
  console.error("Usage: node scripts/import-users.mjs <json-path>");
  process.exit(1);
}

let data;
try {
  data = JSON.parse(readFileSync(resolve(jsonPath), "utf-8"));
} catch (err) {
  console.error(`Could not read ${jsonPath}: ${err.message}`);
  process.exit(1);
}
if (!Array.isArray(data)) {
  console.error("The JSON file must contain an array of users.");
  process.exit(1);
}
console.log(`Read ${data.length} users from ${jsonPath}.\n`);

const seen = new Set();
const rows = [];
let invalid = 0;

for (const [index, user] of data.entries()) {
  const label = `#${index + 1}${user?.matricNumber ? ` (${user.matricNumber})` : ""}`;
  // Numbers are fine too (e.g. "level": 300).
  const missing = REQUIRED.filter((key) => user?.[key] == null || !String(user[key]).trim());
  if (missing.length) {
    console.log(`  ⚠ Skipping ${label}: missing ${missing.join(", ")}`);
    invalid++;
    continue;
  }
  if (user.role !== undefined && !ROLES.includes(user.role)) {
    console.log(`  ⚠ Skipping ${label}: unknown role "${user.role}"`);
    invalid++;
    continue;
  }
  const key = matricToDocId(String(user.matricNumber).trim());
  if (seen.has(key)) {
    console.log(`  ⚠ Skipping ${label}: duplicate matric in file`);
    invalid++;
    continue;
  }
  seen.add(key);

  rows.push({
    fullName: String(user.fullName).trim(),
    matricNumber: String(user.matricNumber).trim(),
    departmentId: String(user.departmentId).trim(),
    level: String(user.level).trim(),
    ...(user.email?.trim() && { email: user.email.trim() }),
    ...(user.role && { role: user.role }),
  });
}

let created = 0;
let updated = 0;
let failed = 0;

for (const [index, batch] of chunk(rows, 100).entries()) {
  const result = await ops.mutation("importUsers", { rows: batch });
  created += result.created;
  updated += result.updated;
  failed += result.failed.length;
  result.failed.forEach(({ matricNumber, reason }) =>
    console.log(`  ✗ ${matricNumber}: ${reason}`),
  );
  console.log(
    `  Batch ${index + 1}: ${result.created} created, ${result.updated} updated, ${result.failed.length} failed`,
  );
}

console.log(
  `\nDone! ${created} created, ${updated} updated, ${failed} failed, ${invalid} skipped (invalid in file).`,
);
process.exit(failed || invalid ? 1 : 0);
