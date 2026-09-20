import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { fail, type RegisteredUser } from "./access";

/**
 * Record a voter's full ballot. This replaces the Firestore rules that guarded
 * `votes`: the election must be active, the voter must belong to its
 * department, only positions open to their level are voted on, candidates
 * must belong to the position, and each voter gets one ballot per election.
 *
 * Convex runs the mutation as a serializable transaction: two simultaneous
 * ballots from the same voter conflict, the loser retries, sees the first
 * ballot and is rejected, so no extra uniqueness constraint is needed.
 */
export const castBallot = async (
  ctx: MutationCtx,
  voter: RegisteredUser,
  electionId: Id<"elections">,
  selections: Record<string, Id<"candidates">>,
) => {
  const election = await ctx.db.get(electionId);
  if (!election) throw fail("This election no longer exists.");
  if (election.status !== "active") {
    throw fail("This election is no longer accepting votes.");
  }
  if (election.departmentId !== voter.departmentId) {
    throw fail("You are not eligible to vote in this election.");
  }

  const alreadyVoted = await ctx.db
    .query("votes")
    .withIndex("by_election_voter", (q) =>
      q.eq("electionId", electionId).eq("voterId", voter._id),
    )
    .first();
  if (alreadyVoted) throw fail("You have already voted in this election.");

  const [positions, candidates] = await Promise.all([
    ctx.db
      .query("positions")
      .withIndex("by_election_order", (q) => q.eq("electionId", electionId))
      .collect(),
    ctx.db
      .query("candidates")
      .withIndex("by_election", (q) => q.eq("electionId", electionId))
      .collect(),
  ]);

  // The server decides which positions this voter may vote on.
  const eligiblePositions = positions.filter(
    (position) =>
      position.allowedLevels.length === 0 ||
      position.allowedLevels.includes(voter.level),
  );
  if (eligiblePositions.length === 0) {
    throw fail("There are no positions for you to vote on in this election.");
  }
  const eligibleIds = new Set<string>(eligiblePositions.map((p) => p._id));

  for (const [positionId, candidateId] of Object.entries(selections)) {
    if (!eligibleIds.has(positionId)) {
      throw fail("Ballot contains a position you cannot vote for.");
    }
    const valid = candidates.some(
      (c) => c._id === candidateId && c.positionId === positionId,
    );
    if (!valid) throw fail("Ballot contains an invalid candidate.");
  }

  const votedAt = Date.now();
  for (const position of eligiblePositions) {
    await ctx.db.insert("votes", {
      electionId,
      positionId: position._id,
      candidateId: selections[position._id] ?? "abstain",
      voterId: voter._id,
      votedAt,
    });
  }
};
