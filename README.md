# Babcock Votes Scripts

This directory contains various utility scripts for managing the Babcock Votes platform.

## Prerequisites

1. Create a Firebase Service Account key from the Firebase Console (**Project Settings -> Service Accounts -> Generate new private key**).
2. Save it securely to your local machine (e.g., as `service-account-key.json` in the project root).
3. For most scripts, you can pass the path to this key as the last argument, or set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="./service-account-key.json"
   ```
4. For the **stress test** specifically, you must create a `.env` file in the root directory and add the raw JSON content of your service account key:
   ```env
   FIREBASE_SERVICE_ACCOUNT_KEY='{ "type": "service_account", ... }'
   ```

## Logical Execution Order

To set up, test, and conclude an election, the scripts should be executed in the following logical order:

### 1. System Setup

**Seed Admins (`seed-users.mjs`)**
Upgrades specific users to admin roles.
*Prerequisite: The intended admins **must** have signed in via Google at least once before running this script so their user profile exists in Firestore.*
```bash
node scripts/seed-users.mjs [service-account-key-path]
```

### 2. Pre-Election Setup (Data Seeding)

**Seed Eligible Voters (`seed-whitelist.mjs`)**
Seeds the `eligible_voters` collection from a CSV file. This defines who is allowed to participate.
*CSV Format:* `fullName,matricNumber,departmentId,level`
```bash
node scripts/seed-whitelist.mjs <csv-path> [service-account-key-path]
```

**Create Part-Time Accounts (`create-pt-accounts.mjs`)**
Creates Firebase Auth accounts for part-time students so they can log in to the platform with generated credentials.
*Prerequisite: You **MUST** run `seed-whitelist.mjs` first, and the students must exist in the whitelist.*
```bash
node scripts/create-pt-accounts.mjs <csv-path> [service-account-key-path]
```

*(Note: Before proceeding to seed candidates, an admin must create an Election in the UI or database to get the `<electionId>`.)*

**Seed Candidates (`seed-candidates.mjs`)**
Seeds positions and candidates for a specific election from a CSV file.
*CSV Format:* `position,display_order,candidate_name,department_id,level`
```bash
node scripts/seed-candidates.mjs <election-id> <csv-path> [service-account-key-path]
```

### 3. Testing (Optional)

**Stress Test (`stress-test.mjs`)**
Simulates concurrent voters to load test the platform and ensure stability.
*Prerequisite: The election must exist and have positions and candidates seeded.*
```bash
npm run stress-test <ELECTION_ID>
```

### 4. Post-Election (Results & Analytics)

**Generate Election Analytics (`generate-election-analytics.mjs`)**
Generates and saves a detailed analytics summary (turnout, winners, margins) for an election to Firestore once voting has concluded.
```bash
node scripts/generate-election-analytics.mjs <electionId> [service-account-key-path]
```

**Audit Votes (`audit-votes.mjs`)**
Generates a detailed CSV audit log of all votes cast for a given election.
```bash
node scripts/audit-votes.mjs <electionId> [service-account-key-path]
```
