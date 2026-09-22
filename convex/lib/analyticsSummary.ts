import { meetsMinimum } from "../../lib/winners";
import type {
  ElectionAnalyticsCandidate,
  ElectionAnalyticsPosition,
  ElectionAnalyticsSummary,
} from "../../lib/election-analytics-types";

export interface AnalyticsInput {
  election: {
    id: string;
    title: string;
    departmentId: string;
    status: string;
    minWinnerPercentage?: number;
  };
  positions: { id: string; title: string }[];
  candidates: { id: string; fullName: string; positionId: string }[];
  /** Eligible voters in the election's department, counted per level. */
  eligibleByLevel: Record<string, number>;
  votes: {
    positionId: string;
    candidateId: string;
    voterId: string;
    /** The voter's level ("UNKNOWN" when their profile is gone). */
    level: string;
    votedAt: number;
  }[];
}

const LEVEL_ORDER = ["100", "200", "300", "400", "500", "600", "Part-Time", "Post-Graduate"];

const pct = (part: number, total: number) =>
  total > 0 ? Number(((part / total) * 100).toFixed(2)) : 0;

const bump = (map: Map<string, number>, key: string, amount = 1) =>
  map.set(key, (map.get(key) ?? 0) + amount);

const sortLevels = (levels: Iterable<string>) =>
  [...levels].sort((a, b) => {
    const ai = LEVEL_ORDER.indexOf(a);
    const bi = LEVEL_ORDER.indexOf(b);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    return a.localeCompare(b, undefined, { numeric: true });
  });

const formatHourLabel = (date: Date) =>
  date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const hourKey = (millis: number) => {
  const d = new Date(millis);
  d.setMinutes(0, 0, 0);
  return d.toISOString();
};

/** Pure computation, ported from the old `scripts/generate-election-analytics.mjs`. */
export const buildSummary = (input: AnalyticsInput): ElectionAnalyticsSummary => {
  const { election, positions, candidates, eligibleByLevel, votes } = input;

  const votesByPosition = new Map<string, number>();
  const votesByPositionCandidate = new Map<string, number>();
  const votesByLevel = new Map<string, number>();
  const uniqueVotersByLevel = new Map<string, Set<string>>();
  const hourlyVotes = new Map<string, number>();
  const uniqueVoters = new Set<string>();
  const voterPositionKeys = new Set<string>();
  let duplicateVoteRecords = 0;

  for (const vote of votes) {
    bump(votesByPosition, vote.positionId);
    bump(votesByPositionCandidate, `${vote.positionId}||${vote.candidateId}`);
    bump(votesByLevel, vote.level);
    if (!uniqueVotersByLevel.has(vote.level)) {
      uniqueVotersByLevel.set(vote.level, new Set());
    }
    uniqueVotersByLevel.get(vote.level)!.add(vote.voterId);

    uniqueVoters.add(vote.voterId);
    const key = `${vote.voterId}||${vote.positionId}`;
    if (voterPositionKeys.has(key)) duplicateVoteRecords += 1;
    else voterPositionKeys.add(key);

    bump(hourlyVotes, hourKey(vote.votedAt));
  }

  const eligibleTotal = Object.values(eligibleByLevel).reduce((a, b) => a + b, 0);
  const allLevels = new Set([
    ...Object.keys(eligibleByLevel),
    ...uniqueVotersByLevel.keys(),
  ]);

  const byLevel = sortLevels(allLevels).map((level) => {
    const eligibleCount = eligibleByLevel[level] ?? 0;
    const uniqueCount = uniqueVotersByLevel.get(level)?.size ?? 0;
    return {
      level,
      eligibleVoters: eligibleCount,
      uniqueVoters: uniqueCount,
      turnoutRate: pct(uniqueCount, eligibleCount),
      voteRecords: votesByLevel.get(level) ?? 0,
    };
  });

  const positionsResult: ElectionAnalyticsPosition[] = positions.map((position) => {
    const totalVoteRecords = votesByPosition.get(position.id) ?? 0;
    const abstentions = votesByPositionCandidate.get(`${position.id}||abstain`) ?? 0;

    const candidateRows: ElectionAnalyticsCandidate[] = candidates
      .filter((c) => c.positionId === position.id)
      .map((candidate) => {
        const count = votesByPositionCandidate.get(`${position.id}||${candidate.id}`) ?? 0;
        return {
          id: candidate.id,
          name: candidate.fullName,
          votes: count,
          percentage: pct(count, totalVoteRecords),
        };
      })
      .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name));

    const withAbstain: ElectionAnalyticsCandidate[] = [
      ...candidateRows,
      {
        id: "abstain",
        name: "ABSTAIN",
        votes: abstentions,
        percentage: pct(abstentions, totalVoteRecords),
        isAbstain: true,
      },
    ];

    const withVotes = candidateRows.filter((c) => c.votes > 0);
    const leader = withVotes[0] ?? null;
    const runnerUp = withVotes[1] ?? null;
    const qualifies =
      leader !== null &&
      meetsMinimum(leader.votes, totalVoteRecords, election.minWinnerPercentage);
    const winner = qualifies ? leader : null;

    return {
      positionId: position.id,
      title: position.title,
      totalVoteRecords,
      abstentions,
      abstainRate: pct(abstentions, totalVoteRecords),
      winner,
      belowMinimum: leader !== null && !qualifies,
      margin: leader
        ? {
            voteDifference: leader.votes - (runnerUp?.votes ?? 0),
            percentagePointDifference: Number(
              (leader.percentage - (runnerUp?.percentage ?? 0)).toFixed(2),
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
      winnerName: p.winner!.name,
      winnerVotes: p.winner!.votes,
      winnerPercentage: p.winner!.percentage,
    }));

  const races = positionsResult
    .filter((p) => p.margin)
    .map((p) => ({
      positionTitle: p.title,
      voteDifference: p.margin!.voteDifference,
      percentagePointDifference: p.margin!.percentagePointDifference,
    }));

  const closestRace =
    [...races].sort(
      (a, b) =>
        a.voteDifference - b.voteDifference ||
        a.percentagePointDifference - b.percentagePointDifference,
    )[0] ?? null;
  const mostDecisiveRace =
    [...races].sort(
      (a, b) =>
        b.voteDifference - a.voteDifference ||
        b.percentagePointDifference - a.percentagePointDifference,
    )[0] ?? null;

  const byHour = [...hourlyVotes.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([timestamp, count]) => ({
      label: formatHourLabel(new Date(timestamp)),
      timestamp,
      votes: count,
    }));

  let running = 0;
  const cumulative = byHour.map((item) => {
    running += item.votes;
    return { ...item, cumulativeVotes: running };
  });

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    election,
    turnout: {
      eligibleVoters: eligibleTotal,
      uniqueVoters: uniqueVoters.size,
      turnoutRate: pct(uniqueVoters.size, eligibleTotal),
      totalVoteRecords: votes.length,
    },
    byLevel,
    timeline: { byHour, cumulative },
    results: {
      winnersBoard,
      competitiveness: { closestRace, mostDecisiveRace },
      positions: positionsResult,
    },
    integrity: {
      ballotRecords: votes.length,
      inferredUniqueVoters: uniqueVoters.size,
      duplicateBallotsDetected: duplicateVoteRecords > 0,
    },
  };
};
