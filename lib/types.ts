import { Timestamp } from "firebase/firestore";

export interface User {
  email: string;
  fullName: string;
  matricNumber: string;
  department: string;
  level: string;
  role: "voter" | "admin";
  createdAt: Timestamp;
}

export interface Election {
  id: string;
  title: string;
  description: string;
  startDate: Timestamp;
  endDate: Timestamp;
  status: "upcoming" | "active" | "completed";
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
