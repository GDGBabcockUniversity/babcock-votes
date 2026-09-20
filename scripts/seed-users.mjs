/**
 * Seed admin users for the voting platform.
 *
 * Admins sign in with Google and complete registration like anyone else, then
 * this script upgrades their role. Run it AFTER the admin has signed in and
 * registered at least once (so their profile exists).
 *
 * Usage:
 *   node scripts/seed-users.mjs
 *
 * Environment (.env.local): NEXT_PUBLIC_CONVEX_URL, OPS_SECRET
 */

import { ops } from "./lib/convex.mjs";

// --- Define admins by their school email ---
const admins = [
  {
    email: "ibironkev5569@student.babcock.edu.ng",
    role: "super_admin",
  },
  // Add more admins as needed:
  // { email: "deptadmin@student.babcock.edu.ng", role: "dept_admin" },
];

for (const admin of admins) {
  try {
    const { status } = await ops.mutation("setRoleByEmail", admin);

    if (status === "updated") {
      console.log(`✓ Updated ${admin.email} → ${admin.role}`);
    } else if (status === "not-registered") {
      console.warn(
        `⚠ ${admin.email} signed in but hasn't completed registration yet.`,
      );
    } else {
      console.warn(
        `⚠ ${admin.email} has not signed in yet. They need to sign in with Google first.`,
      );
    }
  } catch (err) {
    console.error(`✗ Failed for ${admin.email}:`, err.message);
  }
}

console.log("\nDone!");
process.exit(0);
