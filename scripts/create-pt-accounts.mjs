/**
 * Create Firebase Auth accounts for part-time students and fully provision
 * their Firestore profiles so they can log in and vote immediately.
 *
 * What this script does for each student:
 *   1. Creates a Firebase Auth user with a fabricated email + random password
 *   2. Updates the existing eligible_voters/{docId} with claimedByUid / claimedEmail
 *   3. Creates a users/{uid} profile doc (same as what registration does)
 *   4. Writes credentials to an output CSV for distribution
 *
 * Prerequisites:
 *   - The students MUST already be in the `eligible_voters` collection
 *     (run seed-whitelist.mjs first with the same CSV)
 *
 * CSV format (with header row):
 *   fullName,matricNumber,departmentId,level
 *
 * Usage:
 *   node scripts/create-pt-accounts.mjs <csv-path> [service-account-key-path]
 *
 * Environment:
 *   GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json
 *   (or pass as second argument)
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { randomBytes } from "crypto";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// --- Config ---
const csvPath = process.argv[2];
const keyPath = process.argv[3] || process.env.GOOGLE_APPLICATION_CREDENTIALS;

const PT_EMAIL_DOMAIN = "parttime.babcockvotes.com";

if (!csvPath) {
  console.error(
    "Usage: node scripts/create-pt-accounts.mjs <csv-path> [service-account-key-path]",
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
const adminAuth = getAuth(app);
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

console.log(`Parsed ${rows.length} part-time students from CSV.\n`);

// --- Helpers ---
function generatePassword() {
  // 8-char alphanumeric password
  return randomBytes(6).toString("base64url").slice(0, 8);
}

function matricToDocId(matric) {
  return matric.replace(/\//g, "-").toLowerCase();
}

// --- Process each student ---
const credentials = [];
let created = 0;
let skippedExists = 0;
let skippedNoWhitelist = 0;
let errors = 0;

for (const row of rows) {
  const matric = row.matricNumber;
  if (!matric) {
    console.log(`  ⚠ Skipping row with no matric number: ${row.fullName}`);
    continue;
  }

  const fakeEmail = `${matric.replace(/\//g, "-").toLowerCase()}@${PT_EMAIL_DOMAIN}`;
  const docId = matricToDocId(matric);

  try {
    // 1. Check if the eligible_voters doc exists
    const eligibleRef = db.collection("eligible_voters").doc(docId);
    const eligibleSnap = await eligibleRef.get();

    if (!eligibleSnap.exists) {
      console.log(
        `  ⚠ Skipping ${matric} — not found in eligible_voters. Run seed-whitelist.mjs first.`,
      );
      skippedNoWhitelist++;
      continue;
    }

    // Check if already claimed
    const eligibleData = eligibleSnap.data();
    if (eligibleData.claimedByUid) {
      console.log(
        `  ⚠ Skipping ${matric} — already claimed by ${eligibleData.claimedEmail}`,
      );
      skippedExists++;
      continue;
    }

    // 2. Check if Firebase Auth user already exists
    let userRecord;
    let password;
    try {
      userRecord = await adminAuth.getUserByEmail(fakeEmail);
      console.log(
        `  ⚠ Skipping ${matric} — Auth user already exists (${userRecord.uid})`,
      );
      skippedExists++;
      continue;
    } catch (err) {
      if (err.code !== "auth/user-not-found") throw err;
      // User doesn't exist — good, we'll create them
    }

    // 3. Create Firebase Auth user
    password = generatePassword();
    userRecord = await adminAuth.createUser({
      email: fakeEmail,
      displayName: row.fullName,
      emailVerified: true,
      password: password,
    });

    const uid = userRecord.uid;

    // 4. Claim eligible_voters doc + create user profile in a batch
    const batch = db.batch();

    // Claim the eligible_voters doc
    batch.update(eligibleRef, {
      claimedByUid: uid,
      claimedEmail: fakeEmail,
    });

    // Create the user profile doc
    batch.set(db.collection("users").doc(uid), {
      email: fakeEmail,
      fullName: row.fullName,
      matricNumber: matric,
      departmentId: row.departmentId,
      level: row.level,
      role: "voter",
      createdAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    credentials.push({
      fullName: row.fullName,
      matricNumber: matric,
      email: fakeEmail,
      password: password,
    });

    created++;
    console.log(`  ✓ ${matric} → ${fakeEmail} (${uid})`);
  } catch (err) {
    console.error(`  ✗ Failed for ${matric}: ${err.message}`);
    errors++;
  }
}

// --- Write credentials CSV ---
if (credentials.length > 0) {
  const csvHeader = "fullName,matricNumber,email,password";
  const csvRows = credentials.map(
    (c) => `${c.fullName},${c.matricNumber},${c.email},${c.password}`,
  );
  const csvContent = [csvHeader, ...csvRows].join("\n");
  const outputPath = resolve("pt-credentials.csv");
  writeFileSync(outputPath, csvContent, "utf-8");
  console.log(`\nCredentials written to: ${outputPath}`);
}

console.log(
  `\nDone! ${created} created, ${skippedExists} skipped (already exist), ${skippedNoWhitelist} skipped (not in whitelist), ${errors} errors.`,
);
process.exit(0);
