/** Milliseconds since the epoch, as stored by Convex. */
export type Millis = number;

export interface User {
  email: string;
  fullName: string;
  matricNumber: string;
  departmentId: string;
  level: string;
  role: "voter" | "dept_admin" | "super_admin" | "viewer";
  createdAt: Millis;
}

export interface EligibleVoter {
  fullName: string;
  departmentId: string;
  level: string;
  claimedByUid?: string | null;
  claimedEmail?: string | null;
}

export interface Election {
  id: string;
  title: string;
  description: string;
  departmentId: string;
  logoUrl?: string;
  startDate: Millis;
  endDate: Millis;
  /** Share of a position's ballots (abstentions included) an unopposed candidate needs to win; unset = plurality. */
  minWinnerPercentage?: number;
  status: "upcoming" | "active" | "closed";
  candidateCount: number;
  createdBy: string;
  createdAt: Millis;
  isDuplicate?: boolean;
  duplicatedFromElectionId?: string | null;
  duplicatedAt?: Millis | null;
  duplicatedBy?: string | null;
}

export interface Position {
  id: string;
  electionId: string;
  title: string;
  description: string;
  order: number;
  allowedLevels?: string[];
}

export interface Candidate {
  id: string;
  electionId: string;
  positionId: string;
  fullName: string;
  photoUrl: string;
  manifesto: string;
  departmentId: string;
  level: string;
}

export interface Vote {
  electionId: string;
  positionId: string;
  candidateId: string;
  voterId: string;
  votedAt: Millis;
}
