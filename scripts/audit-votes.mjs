/**
 * Audit every vote for a given election.
 *
 * For each vote, outputs: voter name, voter email, matric number, position
 * title, candidate name (or "ABSTAIN"), and the timestamp.
 *
 * Usage:
 *   node scripts/audit-votes.mjs <electionId>
 *
 * Output:
 *   Writes a CSV to ./audit-<electionId>.csv
 */

import { writeFileSync } from "fs";
import { resolve } from "path";
import { ops } from "./lib/convex.mjs";

const electionId = process.argv[2];
if (!electionId) {
  console.error("Usage: node scripts/audit-votes.mjs <electionId>");
  process.exit(1);
}

console.log(`Auditing votes for election: ${electionId}\n`);

const escCsv = (val) => {
  const s = String(val ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
};

const rows = [];
let cursor = null;
while (true) {
  const page = await ops.query("auditPage", { electionId, cursor });
  rows.push(...page.rows);
  process.stdout.write(`\r  ${rows.length} votes...`);
  if (page.isDone) break;
  cursor = page.continueCursor;
}
console.log(`\rFound ${rows.length} vote records.\n`);

if (rows.length === 0) {
  console.log("No votes to audit.");
  process.exit(0);
}

const header = ["voter_name", "voter_email", "voter_matric", "position", "candidate_voted_for", "voted_at"];
const lines = rows
  .map((r) =>
    [r.voterName, r.voterEmail, r.voterMatric, r.position, r.candidate, r.votedAt]
      .map(escCsv)
      .join(","),
  )
  .sort(); // by voter name, then position: easy scanning

const outPath = resolve(`audit-${electionId}.csv`);
writeFileSync(outPath, [header.join(","), ...lines].join("\n"), "utf-8");
console.log(`Written ${lines.length} rows to ${outPath}`);

// --- Quick summary: flag non-school emails ---
const schoolDomain = "babcock.edu.ng";
const nonSchool = new Map();
for (const r of rows) {
  if (r.voterEmail && !r.voterEmail.endsWith(`@${schoolDomain}`) && !nonSchool.has(r.voterEmail)) {
    nonSchool.set(r.voterEmail, r.voterName);
  }
}

if (nonSchool.size > 0) {
  console.log(`\n⚠ ${nonSchool.size} voter(s) used non-school emails:\n`);
  for (const [email, name] of nonSchool) console.log(`  ${name} — ${email}`);
} else {
  console.log("\n✓ All voters used school emails.");
}

process.exit(0);
