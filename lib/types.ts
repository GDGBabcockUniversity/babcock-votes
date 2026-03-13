import { Timestamp } from "firebase/firestore";

export interface User {
  email: string;
  fullName: string;
  matricNumber: string;
  sex: "male" | "female";
  department: string;
  level: string;
  role: "voter" | "dept_admin" | "super_admin";
  createdAt: Timestamp;
}

export interface Election {
  id: string;
  title: string;
  description: string;
  department: string;
  startDate: Timestamp;
  endDate: Timestamp;
  status: "upcoming" | "active" | "closed";
  candidateCount: number;
  createdBy: string;
  createdAt: Timestamp;
}

export interface Position {
  id: string;
  title: string;
  description: string;
  order: number;
}

export interface Candidate {
  id: string;
  positionId: string;
  fullName: string;
  photoUrl: string;
  manifesto: string;
  department: string;
  level: string;
  voteCount: number;
}

export interface Vote {
  electionId: string;
  positionId: string;
  candidateId: string;
  voterId: string;
  votedAt: Timestamp;
}
