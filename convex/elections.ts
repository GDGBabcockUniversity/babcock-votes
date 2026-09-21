import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { fail, getViewer, requireAdmin } from "./lib/access";
import {
  loadCandidates,
  loadPositions,
  toCandidate,
  toElection,
  toPosition,
} from "./lib/election";
import * as validate from "./lib/validate";
import { electionStatus } from "./schema";

/** Elections, newest first. Visible to any signed-in user (demo elections are hidden client-side). */
export const list = query({
  args: {
    limit: v.optional(v.number()),
    orderBy: v.optional(v.union(v.literal("startDate"), v.literal("createdAt"))),
  },
  handler: async (ctx, args) => {
    if (!(await getViewer(ctx))) return [];

    const elections = await (args.orderBy === "createdAt"
      ? ctx.db.query("elections").withIndex("by_created_at")
      : ctx.db.query("elections").withIndex("by_start_date")
    )
      .order("desc")
      .take(Math.min(args.limit ?? 500, 500));

    return Promise.all(elections.map((e) => toElection(ctx, e)));
  },
});

/**
 * One election with its positions (by order) and candidates. `id` comes from
 * the URL, so a malformed or unknown one is "not found" rather than an error.
 */
export const detail = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    if (!(await getViewer(ctx))) return null;

    const electionId = ctx.db.normalizeId("elections", args.id);
    const election = electionId ? await ctx.db.get(electionId) : null;
    if (!election) return null;

    const [positions, candidates] = await Promise.all([
      loadPositions(ctx, election._id),
      loadCandidates(ctx, election._id),
    ]);

    return {
      election: await toElection(ctx, election),
      positions: positions.map(toPosition),
      candidates: await Promise.all(candidates.map((c) => toCandidate(ctx, c))),
    };
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    departmentId: v.string(),
    status: electionStatus,
    logoStorageId: v.optional(v.id("_storage")),
    startDate: v.number(),
    endDate: v.number(),
    minWinnerPercentage: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const departmentId = validate.departmentId(args.departmentId);
    const admin = await requireAdmin(ctx, { departmentId });
    validate.dateRange(args.startDate, args.endDate);

    return ctx.db.insert("elections", {
      title: validate.text(args.title, "Title"),
      description: validate.optionalText(args.description, "Description"),
      departmentId,
      status: args.status,
      logoStorageId: args.logoStorageId,
      startDate: args.startDate,
      endDate: args.endDate,
      ...(args.minWinnerPercentage !== undefined && {
        minWinnerPercentage: validate.minWinnerPercentage(args.minWinnerPercentage),
      }),
      candidateCount: 0,
      createdBy: admin._id,
      createdAt: Date.now(),
    });
  },
});

/**
 * Partial update: anything left out is unchanged; `logoStorageId: null` removes
 * the logo and `minWinnerPercentage: null` removes the minimum.
 */
export const update = mutation({
  args: {
    id: v.id("elections"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    departmentId: v.optional(v.string()),
    status: v.optional(electionStatus),
    logoStorageId: v.optional(v.union(v.id("_storage"), v.null())),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    minWinnerPercentage: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    const election = await ctx.db.get(args.id);
    if (!election) throw fail("Election not found.");
    await requireAdmin(ctx, { departmentId: election.departmentId });

    const departmentId =
      args.departmentId === undefined
        ? election.departmentId
        : validate.departmentId(args.departmentId);
    // A department admin can't move an election into another department.
    await requireAdmin(ctx, { departmentId });

    validate.dateRange(
      args.startDate ?? election.startDate,
      args.endDate ?? election.endDate,
    );

    await ctx.db.patch(args.id, {
      ...(args.title !== undefined && { title: validate.text(args.title, "Title") }),
      ...(args.description !== undefined && {
        description: validate.optionalText(args.description, "Description"),
      }),
      departmentId,
      ...(args.status !== undefined && { status: args.status }),
      ...(args.startDate !== undefined && { startDate: args.startDate }),
      ...(args.endDate !== undefined && { endDate: args.endDate }),
      ...(args.minWinnerPercentage !== undefined && {
        minWinnerPercentage:
          args.minWinnerPercentage === null
            ? undefined
            : validate.minWinnerPercentage(args.minWinnerPercentage),
      }),
      ...(args.logoStorageId !== undefined && {
        logoStorageId: args.logoStorageId ?? undefined,
      }),
    });

    // Demo elections share their logo file with the source election.
    if (
      args.logoStorageId !== undefined &&
      args.logoStorageId !== election.logoStorageId &&
      !election.isDuplicate
    ) {
      await deleteFile(ctx, election.logoStorageId);
    }
  },
});

/** Create an active "Demo" copy (positions + candidates) of an election for testing. */
export const duplicate = mutation({
  args: { id: v.id("elections") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, { superOnly: true });
    const source = await ctx.db.get(args.id);
    if (!source) throw fail("Election not found.");

    const [positions, candidates] = await Promise.all([
      loadPositions(ctx, source._id),
      loadCandidates(ctx, source._id),
    ]);

    const now = Date.now();
    const electionId = await ctx.db.insert("elections", {
      title: `${source.title} (Demo)`,
      description:
        "This is a demo election for testing. It is currently active, results from this demo will not count, and it will be deleted after testing.",
      departmentId: source.departmentId,
      logoStorageId: source.logoStorageId,
      startDate: source.startDate,
      endDate: source.endDate,
      minWinnerPercentage: source.minWinnerPercentage,
      status: "active",
      candidateCount: candidates.length,
      createdBy: admin._id,
      createdAt: now,
      isDuplicate: true,
      duplicatedFromElectionId: source._id,
      duplicatedBy: admin._id,
      duplicatedAt: now,
    });

    const positionIds = new Map<Id<"positions">, Id<"positions">>();
    for (const position of positions) {
      positionIds.set(
        position._id,
        await ctx.db.insert("positions", {
          electionId,
          title: position.title,
          description: position.description,
          order: position.order,
          allowedLevels: position.allowedLevels,
        }),
      );
    }
    for (const candidate of candidates) {
      await ctx.db.insert("candidates", {
        electionId,
        positionId: positionIds.get(candidate.positionId) ?? candidate.positionId,
        fullName: candidate.fullName,
        // Shares the source's photo file; deleting a demo never deletes files.
        photoStorageId: candidate.photoStorageId,
        manifesto: candidate.manifesto,
        departmentId: candidate.departmentId,
        level: candidate.level,
      });
    }

    return { id: electionId, positions: positions.length, candidates: candidates.length };
  },
});

export const deleteFile = async (
  ctx: MutationCtx,
  storageId: Id<"_storage"> | undefined,
) => {
  if (!storageId) return;
  try {
    await ctx.storage.delete(storageId);
  } catch {
    // Already gone.
  }
};

/**
 * Delete an election and everything under it. The election, positions,
 * candidates and files go now; the (possibly tens of thousands of)
 * vote rows are removed in chunks by `purgeVotes`, since one mutation can only
 * write 16,000 documents.
 */
export const remove = mutation({
  args: { id: v.id("elections") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, { superOnly: true });
    const election = await ctx.db.get(args.id);
    if (!election) throw fail("Election not found.");

    const [positions, candidates, analytics] = await Promise.all([
      loadPositions(ctx, args.id),
      loadCandidates(ctx, args.id),
      ctx.db
        .query("electionAnalytics")
        .withIndex("by_election", (q) => q.eq("electionId", args.id))
        .collect(),
    ]);

    // Demo elections share image files with the election they were copied from.
    if (!election.isDuplicate) {
      await deleteFile(ctx, election.logoStorageId);
      for (const candidate of candidates) {
        await deleteFile(ctx, candidate.photoStorageId);
      }
    }

    for (const candidate of candidates) await ctx.db.delete(candidate._id);
    for (const position of positions) await ctx.db.delete(position._id);
    for (const summary of analytics) await ctx.db.delete(summary._id);
    await ctx.db.delete(election._id);

    await ctx.scheduler.runAfter(0, internal.elections.purgeVotes, {
      electionId: args.id,
    });
  },
});

const PURGE_CHUNK = 1000;

export const purgeVotes = internalMutation({
  args: { electionId: v.id("elections") },
  handler: async (ctx, args) => {
    const votes = await ctx.db
      .query("votes")
      .withIndex("by_election", (q) => q.eq("electionId", args.electionId))
      .take(PURGE_CHUNK);

    for (const vote of votes) await ctx.db.delete(vote._id);

    if (votes.length === PURGE_CHUNK) {
      await ctx.scheduler.runAfter(0, internal.elections.purgeVotes, args);
    }
  },
});
