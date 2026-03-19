/*
  Babcock Votes Stress Tester
  
  Instructions:
  1. Create a Firebase Service Account key from the Firebase Console (Project Settings -> Service Accounts -> Generate new private key).
  2. Save it securely, and copy its raw JSON content.
  3. Create a `.env.local` or `.env` file in the root directory and add:
     FIREBASE_SERVICE_ACCOUNT_KEY='{ "type": "service_account", ... }'
  
  Usage:
  npm run stress-test <ELECTION_ID>
*/

import "dotenv/config";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// 1. Initialize Firebase Admin
let app;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    app = initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    app = initializeApp();
  }
} catch (e) {
  console.error("\n❌ Failed to initialize Firebase Admin SDK.", e);
  console.error(
    "Please ensure FIREBASE_SERVICE_ACCOUNT_KEY is set in your .env file.\n",
  );
  process.exit(1);
}

const db = getFirestore(app);

async function runStressTest() {
  const electionId = process.argv[2];
  if (!electionId) {
    console.error("\n❌ Please provide an election ID.");
    console.error("Usage: npm run stress-test <election_id>\n");
    process.exit(1);
  }

  console.log(`\nStarting stress test on election: ${electionId}...`);

  const electionRef = db.collection("elections").doc(electionId);
  const electionDoc = await electionRef.get();

  if (!electionDoc.exists) {
    console.error(`❌ Election ${electionId} not found.`);
    process.exit(1);
  }

  const [positionsSnap, candidatesSnap] = await Promise.all([
    electionRef.collection("positions").get(),
    electionRef.collection("candidates").get(),
  ]);

  const positions = positionsSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  const candidates = candidatesSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  if (positions.length === 0 || candidates.length === 0) {
    console.error("❌ Election has no positions or candidates. Cannot test.");
    process.exit(1);
  }

  const NUM_VOTERS = 500;
  console.log(`Simulating ${NUM_VOTERS} concurrent voters...\n`);

  let successCount = 0;
  let failCount = 0;

  const startTime = Date.now();
  const promises = [];

  for (let i = 0; i < NUM_VOTERS; i++) {
    const voterId = `stress_voter_${Date.now()}_${i}`;

    // Pick exactly one random candidate per position
    const selections = {};
    for (const pos of positions) {
      const posCands = candidates.filter((c) => c.positionId === pos.id);
      if (posCands.length > 0) {
        const randomCand =
          posCands[Math.floor(Math.random() * posCands.length)];
        selections[pos.id] = randomCand.id;
      }
    }

    // Attempt to write the votes using a batch to mimic frontend atomic writes
    const batch = db.batch();

    Object.keys(selections).forEach((posId) => {
      const voteDocId = `${voterId}_${posId}`;
      const voteRef = db.collection("votes").doc(voteDocId);

      batch.create(voteRef, {
        electionId: electionId,
        positionId: posId,
        candidateId: selections[posId],
        voterId: voterId,
        votedAt: new Date(),
      });
    });

    promises.push(
      batch
        .commit()
        .then(() => {
          successCount++;
          if ((successCount + failCount) % 50 === 0) {
            console.log(`Processed ${successCount + failCount} votes...`);
          }
        })
        .catch((err) => {
          console.error(err);
          failCount++;
        }),
    );
  }

  await Promise.all(promises);

  const duration = (Date.now() - startTime) / 1000;

  console.log(`\n=============================`);
  console.log(`✅ Stress Test Complete!`);
  console.log(`=============================`);
  console.log(`Total duration : ${duration}s`);
  console.log(`Successful     : ${successCount}`);
  console.log(`Failed         : ${failCount}`);
  console.log(
    `Avg Throughput : ${(NUM_VOTERS / duration).toFixed(2)} votes/sec`,
  );
  console.log(`=============================\n`);
}

runStressTest().catch(console.error);
