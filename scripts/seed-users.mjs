/**
 * Seed admin users for the voting platform.
 *
 * With Google Sign-In, admins sign in normally via Google, then this script
 * upgrades their role. Run this AFTER the admin has signed in at least once
 * (so their users/{uid} doc exists).
 *
 * Usage:
 *   node scripts/seed-users.mjs
 *
 * Environment:
 *   GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const keyPath = process.argv[2] || process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!keyPath) {
  console.error(
    "Provide a service account key via GOOGLE_APPLICATION_CREDENTIALS or as the first argument.",
  );
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(resolve(keyPath), "utf-8"));
const app = initializeApp({ credential: cert(serviceAccount) });
const adminAuth = getAuth(app);
const db = getFirestore(app);

// --- Define admins by their school email ---
const admins = [
  {
    email: "admin@student.babcock.edu.ng",
    role: "super_admin",
  },
  // Add more admins as needed:
  // { email: "deptadmin@student.babcock.edu.ng", role: "dept_admin" },
];

for (const admin of admins) {
  try {
    // Look up the Firebase Auth user by email
    const userRecord = await adminAuth.getUserByEmail(admin.email);
    const uid = userRecord.uid;

    // Update their role in Firestore
    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.get();

    if (!snap.exists) {
      console.warn(
        `⚠ No user doc found for ${admin.email} (uid: ${uid}). Has this user signed in yet?`,
      );
      continue;
    }

    await userRef.update({ role: admin.role });
    console.log(`✓ Updated ${admin.email} → ${admin.role}`);
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      console.warn(
        `⚠ ${admin.email} has not signed in yet. They need to sign in with Google first.`,
      );
    } else {
      console.error(`✗ Failed for ${admin.email}:`, err.message);
    }
  }
}

console.log("\nDone!");
process.exit(0);
