/*
  Babcock Votes Stress Tester

  Creates synthetic voters and casts ballots through the same code path as the
  real vote mutation (convex/lib/ballot.ts), concurrently, then removes the
  synthetic voters and their votes again (pass --keep to leave them).

  Run it against a demo/duplicated election on a dev deployment.

  Setup: NEXT_PUBLIC_CONVEX_URL and OPS_SECRET in .env.local.

  Usage:
    npm run stress-test <ELECTION_ID>

  Optional env: STRESS_VOTERS=500 STRESS_CONCURRENCY=25 STRESS_LEVEL=100
*/

import { chunk, ops } from "./lib/convex.mjs";

const NUM_VOTERS = Number(process.env.STRESS_VOTERS ?? 500);
const CONCURRENCY = Number(process.env.STRESS_CONCURRENCY ?? 25);
const LEVEL = process.env.STRESS_LEVEL ?? "100";
const KEEP = process.argv.includes("--keep");

async function runStressTest() {
  const electionId = process.argv[2];
  if (!electionId || electionId.startsWith("--")) {
    console.error("\n❌ Please provide an election ID.");
    console.error("Usage: npm run stress-test <election_id>\n");
    process.exit(1);
  }

  console.log(`\nStarting stress test on election: ${electionId}...`);

  const election = await ops.query("stressElection", { electionId }).catch((err) => {
    console.error(`❌ ${err.message.split("\n")[0]}`);
    process.exit(1);
  });

  if (election.status !== "active") {
    console.error(`❌ Election is "${election.status}"; ballots are only accepted while active.`);
    process.exit(1);
  }
  if (election.positions.length === 0 || election.candidates.length === 0) {
    console.error("❌ Election has no positions or candidates. Cannot test.");
    process.exit(1);
  }

  // Positions this synthetic level may vote on (some can be restricted).
  const positions = election.positions.filter(
    (p) => p.allowedLevels.length === 0 || p.allowedLevels.includes(LEVEL),
  );

  const runId = Date.now().toString(36);
  console.log(`Creating ${NUM_VOTERS} synthetic voters (level ${LEVEL})...`);
  const voterIds = [];
  for (let created = 0; created < NUM_VOTERS; created += 100) {
    voterIds.push(
      ...(await ops.mutation("stressCreateVoters", {
        runId: `${runId}-${created}`,
        count: Math.min(100, NUM_VOTERS - created),
        departmentId: election.departmentId,
        level: LEVEL,
      })),
    );
  }

  console.log(`Casting ballots, ${CONCURRENCY} at a time...\n`);
  let successCount = 0;
  let failCount = 0;

  const castBallot = async (voterId) => {
    // One random candidate per position.
    const selections = {};
    for (const position of positions) {
      const options = election.candidates.filter((c) => c.positionId === position.id);
      if (options.length > 0) {
        selections[position.id] = options[Math.floor(Math.random() * options.length)].id;
      }
    }

    try {
      await ops.mutation("stressCast", { electionId, voterId, selections });
      successCount++;
    } catch (err) {
      console.error(err.message.split("\n")[0]);
      failCount++;
    }

    if ((successCount + failCount) % 50 === 0) {
      console.log(`Processed ${successCount + failCount} ballots...`);
    }
  };

  const startTime = Date.now();
  for (const group of chunk(voterIds, CONCURRENCY)) {
    await Promise.all(group.map(castBallot));
  }
  const duration = (Date.now() - startTime) / 1000;

  console.log(`\n=============================`);
  console.log(`✅ Stress Test Complete!`);
  console.log(`=============================`);
  console.log(`Total duration : ${duration}s`);
  console.log(`Successful     : ${successCount}`);
  console.log(`Failed         : ${failCount}`);
  console.log(`Avg Throughput : ${(NUM_VOTERS / duration).toFixed(2)} ballots/sec`);
  console.log(`=============================\n`);

  if (KEEP) {
    console.log("Synthetic voters and votes kept (--keep).");
  } else {
    console.log("Cleaning up synthetic voters and their votes...");
    for (const group of chunk(voterIds, 25)) {
      await ops.mutation("stressCleanup", { voterIds: group });
    }
    console.log("Done.");
  }
}

runStressTest().catch(console.error);
