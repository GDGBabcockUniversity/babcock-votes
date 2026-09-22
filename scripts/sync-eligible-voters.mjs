/**
 * Make every registered user in a department an eligible voter.
 *
 * Eligible-voter counts and turnout come from `eligibleVoters`, which the
 * class-list import doesn't write. This creates a row for each registered
 * user in the department (through `ops.syncEligibleVotersFromUsers`), claimed
 * by that user, or links an existing unclaimed row to them. A row already
 * claimed by someone else is left alone and reported as a conflict.
 *
 * Usage:
 *   node scripts/sync-eligible-voters.mjs --department medicine
 *
 * Environment (.env.local): NEXT_PUBLIC_CONVEX_URL, OPS_SECRET
 *
 * Re-running is safe: users who are already eligible are counted, not
 * duplicated, so a second run creates nothing.
 */

import { ConvexError } from "convex/values";
import { ops } from "./lib/convex.mjs";

const args = process.argv.slice(2);
const index = args.indexOf("--department");
const departmentId = index === -1 ? undefined : args[index + 1];
if (!departmentId || departmentId.startsWith("--")) {
  console.error("Usage: node scripts/sync-eligible-voters.mjs --department <id>");
  process.exit(1);
}

const totals = { created: 0, linked: 0, alreadyEligible: 0, notRegistered: 0 };
const conflicts = [];
let cursor = null;
let page = 0;
try {
  for (;;) {
    const result = await ops.mutation("syncEligibleVotersFromUsers", {
      departmentId,
      cursor,
    });
    page++;
    for (const key of Object.keys(totals)) totals[key] += result[key];
    conflicts.push(...result.conflicts);
    console.log(
      `  Page ${page}: ${result.created} created, ${result.linked} linked, ` +
        `${result.alreadyEligible} already eligible, ${result.notRegistered} not registered, ` +
        `${result.conflicts.length} conflicts`,
    );
    if (result.isDone) break;
    cursor = result.continueCursor;
  }
} catch (err) {
  console.error(err instanceof ConvexError ? String(err.data) : (err.message ?? err));
  process.exit(1);
}

conflicts.forEach(({ matricNumber, reason }) => console.log(`  ✗ ${matricNumber}: ${reason}`));
console.log(
  `\nDone! ${totals.created} created, ${totals.linked} linked, ` +
    `${totals.alreadyEligible} already eligible, ${totals.notRegistered} not registered, ` +
    `${conflicts.length} conflicts.`,
);
process.exit(conflicts.length ? 1 : 0);
