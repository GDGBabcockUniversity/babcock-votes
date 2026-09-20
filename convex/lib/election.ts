import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import type { Candidate, Election, Position } from "../../lib/types";

/** Convex document -> the shape the UI already uses (string `id`, resolved image URLs). */
export const toElection = async (
  ctx: QueryCtx,
  e: Doc<"elections">,
): Promise<Election> => ({
  id: e._id,
  title: e.title,
  description: e.description,
  departmentId: e.departmentId,
  logoUrl: e.logoStorageId
    ? ((await ctx.storage.getUrl(e.logoStorageId)) ?? undefined)
    : undefined,
  startDate: e.startDate,
  endDate: e.endDate,
  status: e.status,
  candidateCount: e.candidateCount,
  createdBy: e.createdBy,
  createdAt: e.createdAt,
  isDuplicate: e.isDuplicate,
  duplicatedFromElectionId: e.duplicatedFromElectionId,
  duplicatedAt: e.duplicatedAt,
  duplicatedBy: e.duplicatedBy,
});

export const toPosition = (p: Doc<"positions">): Position => ({
  id: p._id,
  electionId: p.electionId,
  title: p.title,
  description: p.description,
  order: p.order,
  allowedLevels: p.allowedLevels,
});

export const toCandidate = async (
  ctx: QueryCtx,
  c: Doc<"candidates">,
): Promise<Candidate> => ({
  id: c._id,
  electionId: c.electionId,
  positionId: c.positionId,
  fullName: c.fullName,
  photoUrl: c.photoStorageId
    ? ((await ctx.storage.getUrl(c.photoStorageId)) ?? "")
    : "",
  manifesto: c.manifesto,
  departmentId: c.departmentId,
  level: c.level,
});

export const loadPositions = (ctx: QueryCtx, electionId: Id<"elections">) =>
  ctx.db
    .query("positions")
    .withIndex("by_election_order", (q) => q.eq("electionId", electionId))
    .collect();

export const loadCandidates = (ctx: QueryCtx, electionId: Id<"elections">) =>
  ctx.db
    .query("candidates")
    .withIndex("by_election", (q) => q.eq("electionId", electionId))
    .collect();
