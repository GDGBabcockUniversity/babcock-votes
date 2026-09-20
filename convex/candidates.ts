import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, type MutationCtx } from "./_generated/server";
import { fail, requireAdmin } from "./lib/access";
import * as validate from "./lib/validate";
import { deleteFile } from "./elections";

const clean = (args: {
  fullName: string;
  manifesto: string;
  departmentId: string;
  level: string;
}) => ({
  fullName: validate.text(args.fullName, "Full name"),
  manifesto: validate.optionalText(args.manifesto, "Manifesto", 20000),
  departmentId: validate.optionalText(args.departmentId, "Department", 64),
  level: validate.optionalText(args.level, "Level", 32),
});

const recountCandidates = async (ctx: MutationCtx, electionId: Id<"elections">) => {
  const candidates = await ctx.db
    .query("candidates")
    .withIndex("by_election", (q) => q.eq("electionId", electionId))
    .collect();
  await ctx.db.patch(electionId, { candidateCount: candidates.length });
};

const requireCandidateAdmin = async (ctx: MutationCtx, id: Id<"candidates">) => {
  const candidate = await ctx.db.get(id);
  if (!candidate) throw fail("Candidate not found.");
  const election = await ctx.db.get(candidate.electionId);
  if (!election) throw fail("Election not found.");
  await requireAdmin(ctx, { departmentId: election.departmentId });
  return { candidate, election };
};

const requirePositionInElection = async (
  ctx: MutationCtx,
  positionId: Id<"positions">,
  electionId: Id<"elections">,
) => {
  const position = await ctx.db.get(positionId);
  if (!position || position.electionId !== electionId) {
    throw fail("Position not found.");
  }
};

export const create = mutation({
  args: {
    electionId: v.id("elections"),
    positionId: v.id("positions"),
    fullName: v.string(),
    manifesto: v.string(),
    departmentId: v.string(),
    level: v.string(),
    photoStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const election = await ctx.db.get(args.electionId);
    if (!election) throw fail("Election not found.");
    await requireAdmin(ctx, { departmentId: election.departmentId });
    await requirePositionInElection(ctx, args.positionId, args.electionId);

    const id = await ctx.db.insert("candidates", {
      electionId: args.electionId,
      positionId: args.positionId,
      photoStorageId: args.photoStorageId,
      ...clean(args),
    });
    await recountCandidates(ctx, args.electionId);
    return id;
  },
});

/** `photoStorageId` left out keeps the current photo; `null` removes it. */
export const update = mutation({
  args: {
    id: v.id("candidates"),
    positionId: v.id("positions"),
    fullName: v.string(),
    manifesto: v.string(),
    departmentId: v.string(),
    level: v.string(),
    photoStorageId: v.optional(v.union(v.id("_storage"), v.null())),
  },
  handler: async (ctx, args) => {
    const { candidate, election } = await requireCandidateAdmin(ctx, args.id);
    await requirePositionInElection(ctx, args.positionId, candidate.electionId);

    await ctx.db.patch(args.id, {
      positionId: args.positionId,
      ...clean(args),
      ...(args.photoStorageId !== undefined && {
        photoStorageId: args.photoStorageId ?? undefined,
      }),
    });

    // Demo elections share photo files with the source election.
    if (
      args.photoStorageId !== undefined &&
      args.photoStorageId !== candidate.photoStorageId &&
      !election.isDuplicate
    ) {
      await deleteFile(ctx, candidate.photoStorageId);
    }
  },
});

export const remove = mutation({
  args: { id: v.id("candidates") },
  handler: async (ctx, args) => {
    const { candidate, election } = await requireCandidateAdmin(ctx, args.id);

    if (!election.isDuplicate) await deleteFile(ctx, candidate.photoStorageId);
    await ctx.db.delete(candidate._id);
    await recountCandidates(ctx, candidate.electionId);
  },
});
