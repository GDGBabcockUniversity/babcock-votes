import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
  query,
  type QueryCtx,
} from "./_generated/server";
import { fail, requireAdmin } from "./lib/access";
import { buildSummary, type AnalyticsInput } from "./lib/analyticsSummary";
import { loadCandidates, loadPositions } from "./lib/election";

/** `electionId` comes from the URL; resolve it and check the caller may see this election. */
const authorize = async (ctx: QueryCtx, electionId: string) => {
  const id = ctx.db.normalizeId("elections", electionId);
  const election = id ? await ctx.db.get(id) : null;
  if (!id || !election) throw fail("Election not found.");
  await requireAdmin(ctx, { departmentId: election.departmentId });
  return id;
};

/** Whether a summary has been generated (cheap check for the results page). */
export const exists = query({
  args: { electionId: v.string() },
  handler: async (ctx, args) => {
    const electionId = await authorize(ctx, args.electionId);
    const row = await ctx.db
      .query("electionAnalytics")
      .withIndex("by_election", (q) => q.eq("electionId", electionId))
      .first();
    return row !== null;
  },
});

export const get = query({
  args: { electionId: v.string() },
  handler: async (ctx, args) => {
    const electionId = await authorize(ctx, args.electionId);
    const row = await ctx.db
      .query("electionAnalytics")
      .withIndex("by_election", (q) => q.eq("electionId", electionId))
      .first();
    return row?.summary ?? null;
  },
});

// --- Generation (run from the CLI: `npx convex run analytics:generate '{"electionId":"…"}'`)

export const loadMeta = internalQuery({
  args: { electionId: v.id("elections") },
  handler: async (ctx, args) => {
    const election = await ctx.db.get(args.electionId);
    if (!election) throw new Error("Election not found.");

    const [positions, candidates, eligible] = await Promise.all([
      loadPositions(ctx, args.electionId),
      loadCandidates(ctx, args.electionId),
      ctx.db
        .query("eligibleVoters")
        .withIndex("by_department", (q) => q.eq("departmentId", election.departmentId))
        .collect(),
    ]);

    const eligibleByLevel: Record<string, number> = {};
    for (const voter of eligible) {
      eligibleByLevel[voter.level || "UNKNOWN"] =
        (eligibleByLevel[voter.level || "UNKNOWN"] ?? 0) + 1;
    }

    return {
      election: {
        id: election._id as string,
        title: election.title,
        departmentId: election.departmentId,
        status: election.status,
      },
      positions: positions.map((p) => ({ id: p._id as string, title: p.title })),
      candidates: candidates.map((c) => ({
        id: c._id as string,
        fullName: c.fullName,
        positionId: c.positionId as string,
      })),
      eligibleByLevel,
    };
  },
});

type VotePage = {
  rows: AnalyticsInput["votes"];
  continueCursor: string;
  isDone: boolean;
};

/** One page of votes joined with each voter's level (a transaction can only scan 32k docs). */
export const votePage = internalQuery({
  args: { electionId: v.id("elections"), cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, args): Promise<VotePage> => {
    const page = await ctx.db
      .query("votes")
      .withIndex("by_election", (q) => q.eq("electionId", args.electionId))
      .paginate({ numItems: 2000, cursor: args.cursor });

    const levels = new Map<Id<"users">, string>();
    const rows: AnalyticsInput["votes"] = [];
    for (const vote of page.page) {
      let level = levels.get(vote.voterId);
      if (level === undefined) {
        level = (await ctx.db.get(vote.voterId))?.level ?? "UNKNOWN";
        levels.set(vote.voterId, level);
      }
      rows.push({
        positionId: vote.positionId,
        candidateId: vote.candidateId,
        voterId: vote.voterId,
        level,
        votedAt: vote.votedAt,
      });
    }

    return { rows, continueCursor: page.continueCursor, isDone: page.isDone };
  },
});

export const save = internalMutation({
  args: {
    electionId: v.id("elections"),
    departmentId: v.string(),
    summary: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("electionAnalytics")
      .withIndex("by_election", (q) => q.eq("electionId", args.electionId))
      .first();
    const row = {
      electionId: args.electionId,
      departmentId: args.departmentId,
      generatedAt: Date.now(),
      summary: args.summary,
    };
    if (existing) await ctx.db.replace(existing._id, row);
    else await ctx.db.insert("electionAnalytics", row);
  },
});

export const generate = internalAction({
  args: { electionId: v.id("elections") },
  handler: async (ctx, args): Promise<{ voteRecords: number }> => {
    const meta = await ctx.runQuery(internal.analytics.loadMeta, args);

    const votes: AnalyticsInput["votes"] = [];
    let cursor: string | null = null;
    while (true) {
      const page: VotePage = await ctx.runQuery(internal.analytics.votePage, {
        electionId: args.electionId,
        cursor,
      });
      votes.push(...page.rows);
      if (page.isDone) break;
      cursor = page.continueCursor;
    }

    const summary = buildSummary({ ...meta, votes });
    await ctx.runMutation(internal.analytics.save, {
      electionId: args.electionId,
      departmentId: meta.election.departmentId,
      summary,
    });
    return { voteRecords: votes.length };
  },
});
