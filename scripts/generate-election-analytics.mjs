/**
 * Generate and save analytics summary for one election.
 *
 * Usage:
 *   node scripts/generate-election-analytics.mjs <electionId> [service-account-key-path]
 *
 * Output:
 *   Saves summary to Firestore: election_analytics/<electionId>
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const LEVEL_ORDER = [
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "Part-Time",
  "Post-Graduate",
];

const dateToIso = (value) => {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return new Date(value).toISOString();
  if (typeof value === "number") return new Date(value).toISOString();
  if (value.seconds) return new Date(value.seconds * 1000).toISOString();
  return null;
};

const pct = (part, total) =>
  total > 0 ? Number(((part / total) * 100).toFixed(2)) : 0;

const increment = (map, key, amount = 1) => {
  map.set(key, (map.get(key) ?? 0) + amount);
};

const sortLevels = (levels) =>
  [...levels].sort((a, b) => {
    const ai = LEVEL_ORDER.indexOf(a);
    const bi = LEVEL_ORDER.indexOf(b);
    if (ai !== -1 || bi !== -1)
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    return a.localeCompare(b, undefined, { numeric: true });
  });

const formatHourLabel = (date) =>
  date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const hourKey = (date) => {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  return d.toISOString();
};

const electionId = process.argv[2];
const keyPath = process.argv[3] || process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!electionId) {
  console.error(
    "Usage: node scripts/generate-election-analytics.mjs <electionId> [service-account-key-path]",
  );
  process.exit(1);
}

if (!keyPath) {
  console.error(
    "Provide a service account key via GOOGLE_APPLICATION_CREDENTIALS or as the second argument.",
  );
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(resolve(keyPath), "utf-8"));
const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

console.log(`Generating analytics for election: ${electionId}`);

const elRef = db.collection("elections").doc(electionId);
const elSnap = await elRef.get();
if (!elSnap.exists) {
  console.error("Election not found.");
  process.exit(1);
}
const election = elSnap.data();

const [posSnap, candSnap, votesSnap, eligibleSnap] = await Promise.all([
  elRef.collection("positions").orderBy("order", "asc").get(),
  elRef.collection("candidates").get(),
  db.collection("votes").where("electionId", "==", electionId).get(),
  election.departmentId
    ? db
        .collection("eligible_voters")
        .where("departmentId", "==", election.departmentId)
        .get()
    : Promise.resolve({ docs: [], size: 0 }),
]);

const positions = posSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
const candidates = candSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
const votes = votesSnap.docs.map((d) => d.data());

console.log(
  `Loaded ${positions.length} positions, ${candidates.length} candidates, ${votes.length} vote records.`,
);

const voterIds = [...new Set(votes.map((v) => v.voterId).filter(Boolean))];
const userMap = new Map();
const BATCH_SIZE = 30;
const MAX_CONCURRENT_BATCHES = 8;
const voterChunks = [];
for (let i = 0; i < voterIds.length; i += BATCH_SIZE) {
  voterChunks.push(voterIds.slice(i, i + BATCH_SIZE));
}

for (let i = 0; i < voterChunks.length; i += MAX_CONCURRENT_BATCHES) {
  const group = voterChunks.slice(i, i + MAX_CONCURRENT_BATCHES);
  const snaps = await Promise.all(
    group.map((chunk) =>
      db.collection("users").where("__name__", "in", chunk).get(),
    ),
  );
  for (const snap of snaps) {
    snap.docs.forEach((d) => userMap.set(d.id, d.data()));
  }
}

console.log(`Resolved ${userMap.size} voter profiles.`);

const votesByPosition = new Map();
const votesByPositionCandidate = new Map();
const votesByLevel = new Map();
const uniqueVotersByLevel = new Map();
const hourlyVotes = new Map();
const uniqueVoters = new Set();
const voterPositionKeys = new Set();
let duplicateVoteRecords = 0;

for (const vote of votes) {
  const posId = vote.positionId;
  const candidateId = vote.candidateId;
  const voterId = vote.voterId;
  const user = userMap.get(voterId);
  const level = user?.level || "UNKNOWN";

  increment(votesByPosition, posId);
  increment(votesByPositionCandidate, `${posId}||${candidateId}`);
  increment(votesByLevel, level);
  if (!uniqueVotersByLevel.has(level))
    uniqueVotersByLevel.set(level, new Set());
  uniqueVotersByLevel.get(level).add(voterId);

  uniqueVoters.add(voterId);
  const vpKey = `${voterId}||${posId}`;
  if (voterPositionKeys.has(vpKey)) duplicateVoteRecords += 1;
  else voterPositionKeys.add(vpKey);

  const iso = dateToIso(vote.votedAt);
  if (iso) increment(hourlyVotes, hourKey(new Date(iso)));
}

const eligibleByLevel = new Map();
eligibleSnap.docs.forEach((d) => {
  const data = d.data();
  increment(eligibleByLevel, data.level || "UNKNOWN");
});

const allLevels = new Set([
  ...eligibleByLevel.keys(),
  ...uniqueVotersByLevel.keys(),
  ...[...userMap.values()].map((u) => u.level || "UNKNOWN"),
]);

const byLevel = sortLevels(allLevels).map((level) => {
  const eligibleCount = eligibleByLevel.get(level) ?? 0;
  const uniqueCount = uniqueVotersByLevel.get(level)?.size ?? 0;
  const voteRecords = votesByLevel.get(level) ?? 0;
  return {
    level,
    eligibleVoters: eligibleCount,
    uniqueVoters: uniqueCount,
    turnoutRate: pct(uniqueCount, eligibleCount),
    voteRecords,
  };
});

const positionsResult = positions.map((position) => {
  const totalVoteRecords = votesByPosition.get(position.id) ?? 0;
  const abstentions =
    votesByPositionCandidate.get(`${position.id}||abstain`) ?? 0;

  const candidateRows = candidates
    .filter((c) => c.positionId === position.id)
    .map((candidate) => {
      const count =
        votesByPositionCandidate.get(`${position.id}||${candidate.id}`) ?? 0;
      return {
        id: candidate.id,
        name: candidate.fullName,
        votes: count,
        percentage: pct(count, totalVoteRecords),
      };
    })
    .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name));

  const withAbstain = [
    ...candidateRows,
    {
      id: "abstain",
      name: "ABSTAIN",
      votes: abstentions,
      percentage: pct(abstentions, totalVoteRecords),
      isAbstain: true,
    },
  ];

  const nonAbstainWithVotes = candidateRows.filter((c) => c.votes > 0);
  const winner = nonAbstainWithVotes[0] ?? null;
  const runnerUp = nonAbstainWithVotes[1] ?? null;

  return {
    positionId: position.id,
    title: position.title,
    totalVoteRecords,
    abstentions,
    abstainRate: pct(abstentions, totalVoteRecords),
    winner,
    margin: winner
      ? {
          voteDifference: winner.votes - (runnerUp?.votes ?? 0),
          percentagePointDifference: Number(
            (winner.percentage - (runnerUp?.percentage ?? 0)).toFixed(2),
          ),
        }
      : null,
    candidates: withAbstain,
  };
});

const winnersBoard = positionsResult
  .filter((p) => p.winner)
  .map((p) => ({
    positionId: p.positionId,
    positionTitle: p.title,
    winnerName: p.winner.name,
    winnerVotes: p.winner.votes,
    winnerPercentage: p.winner.percentage,
  }));

const racesWithMargins = positionsResult
  .filter((p) => p.margin)
  .map((p) => ({
    positionTitle: p.title,
    voteDifference: p.margin.voteDifference,
    percentagePointDifference: p.margin.percentagePointDifference,
  }));

const closestRace =
  racesWithMargins.length === 0
    ? null
    : [...racesWithMargins].sort(
        (a, b) =>
          a.voteDifference - b.voteDifference ||
          a.percentagePointDifference - b.percentagePointDifference,
      )[0];

const mostDecisiveRace =
  racesWithMargins.length === 0
    ? null
    : [...racesWithMargins].sort(
        (a, b) =>
          b.voteDifference - a.voteDifference ||
          b.percentagePointDifference - a.percentagePointDifference,
      )[0];

const byHour = [...hourlyVotes.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([timestamp, votes]) => ({
    label: formatHourLabel(new Date(timestamp)),
    timestamp,
    votes,
  }));

let runningTotal = 0;
const cumulative = byHour.map((item) => {
  runningTotal += item.votes;
  return {
    ...item,
    cumulativeVotes: runningTotal,
  };
});

const summary = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  election: {
    id: electionId,
    title: election.title ?? electionId,
    departmentId: election.departmentId ?? "",
    status: election.status ?? "",
  },
  turnout: {
    eligibleVoters: eligibleSnap.size ?? 0,
    uniqueVoters: uniqueVoters.size,
    turnoutRate: pct(uniqueVoters.size, eligibleSnap.size ?? 0),
    totalVoteRecords: votes.length,
  },
  byLevel,
  timeline: {
    byHour,
    cumulative,
  },
  results: {
    winnersBoard,
    competitiveness: {
      closestRace: closestRace ?? null,
      mostDecisiveRace: mostDecisiveRace ?? null,
    },
    positions: positionsResult,
  },
  integrity: {
    ballotRecords: votes.length,
    inferredUniqueVoters: uniqueVoters.size,
    duplicateBallotsDetected: duplicateVoteRecords > 0,
  },
};

await db
  .collection("election_analytics")
  .doc(electionId)
  .set({
    ...summary,
    updatedAt: FieldValue.serverTimestamp(),
  });

console.log(`Saved analytics summary to election_analytics/${electionId}`);
