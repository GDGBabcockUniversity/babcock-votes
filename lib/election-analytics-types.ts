export interface ElectionAnalyticsCandidate {
  id: string;
  name: string;
  votes: number;
  percentage: number;
  isAbstain?: boolean;
}

export interface ElectionAnalyticsPosition {
  positionId: string;
  title: string;
  totalVoteRecords: number;
  abstentions: number;
  abstainRate: number;
  winner: ElectionAnalyticsCandidate | null;
  margin: {
    voteDifference: number;
    percentagePointDifference: number;
  } | null;
  candidates: ElectionAnalyticsCandidate[];
}

export interface ElectionAnalyticsSummary {
  schemaVersion: 1;
  generatedAt: string;
  election: {
    id: string;
    title: string;
    departmentId: string;
    status: string;
  };
  turnout: {
    eligibleVoters: number;
    uniqueVoters: number;
    turnoutRate: number;
    totalVoteRecords: number;
  };
  byLevel: Array<{
    level: string;
    eligibleVoters: number;
    uniqueVoters: number;
    turnoutRate: number;
    voteRecords: number;
  }>;
  timeline: {
    byHour: Array<{
      label: string;
      timestamp: string;
      votes: number;
    }>;
    cumulative: Array<{
      label: string;
      timestamp: string;
      votes: number;
      cumulativeVotes: number;
    }>;
  };
  results: {
    winnersBoard: Array<{
      positionId: string;
      positionTitle: string;
      winnerName: string;
      winnerVotes: number;
      winnerPercentage: number;
    }>;
    competitiveness: {
      closestRace: {
        positionTitle: string;
        voteDifference: number;
        percentagePointDifference: number;
      } | null;
      mostDecisiveRace: {
        positionTitle: string;
        voteDifference: number;
        percentagePointDifference: number;
      } | null;
    };
    positions: ElectionAnalyticsPosition[];
  };
  integrity: {
    ballotRecords: number;
    inferredUniqueVoters: number;
    duplicateBallotsDetected: boolean;
  };
}
