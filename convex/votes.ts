import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { fail, getViewer, requireRegistered, requireResultsAccess } from "./lib/access";
import { castBallot } from "./lib/ballot";
import { tallyElection } from "./lib/tally";
import { loadCandidates, loadPositions } from "./lib/election";

export const hasVoted = query({
  args: { electionId: v.string() },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    const electionId = ctx.db.normalizeId("elections", args.electionId);
    if (!viewer || !electionId) return false;

    const vote = await ctx.db
      .query("votes")
      .withIndex("by_election_voter", (q) =>
        q.eq("electionId", electionId).eq("voterId", viewer._id),
      )
      .first();
    return vote !== null;
  },
});

/** Cast a full ballot: `selections` maps position -> chosen candidate; missing positions are abstentions. */
export const cast = mutation({
  args: {
    electionId: v.id("elections"),
    selections: v.record(
      v.id("positions"),
      v.union(v.id("candidates"), v.literal("abstain")),
    ),
  },
  handler: async (ctx, args) => {
    const voter = await requireRegistered(ctx);
    await castBallot(ctx, voter, args.electionId, args.selections);
  },
});

/**
 * Live tallies for the results page (admins, and viewers of the election's department), counted from the `votes` table on
 * every read, so what admins see always matches the recorded ballots.
 */
export const tallies = query({
  args: { electionId: v.string() },
  handler: async (ctx, args) => {
    const electionId = ctx.db.normalizeId("elections", args.electionId);
    const election = electionId ? await ctx.db.get(electionId) : null;
    if (!election) throw fail("Election not found.");
    await requireResultsAccess(ctx, election.departmentId);

    const [positions, candidates] = await Promise.all([
      loadPositions(ctx, election._id),
      loadCandidates(ctx, election._id),
    ]);

    return tallyElection(ctx, election._id, positions, candidates);
  },
});
