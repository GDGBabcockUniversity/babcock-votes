import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { fail } from "./access";

/**
 * Cap on how many vote rows a single tally may read. Convex allows 32,000
 * documents per transaction and the caller reads positions and candidates too,
 * so we stop short of it and fail loudly. Truncating instead would show a
 * wrong winner, which is the one outcome a results page must never risk.
 */
const MAX_TALLY_ROWS = 25_000;

export interface Tallies {
  /** Votes per candidate; abstentions are not included. */
  candidateVotes: Record<string, number>;
  /** Every ballot recorded for a position, abstentions included. */
  positionVotes: Record<string, number>;
  /** Abstentions only, per position. */
  positionAbstains: Record<string, number>;
}

/**
 * Count an election's votes straight from the `votes` table. Reading the rows
 * makes the tallies correct by construction: there is no cached number that
 * can drift from the ballots.
 */
export const tallyElection = async (
  ctx: QueryCtx,
  electionId: Id<"elections">,
  positions: Doc<"positions">[],
  candidates: Doc<"candidates">[],
): Promise<Tallies> => {
  const votes = await ctx.db
    .query("votes")
    .withIndex("by_election", (q) => q.eq("electionId", electionId))
    .take(MAX_TALLY_ROWS + 1);

  if (votes.length > MAX_TALLY_ROWS) {
    throw fail(
      "This election has too many votes to tally live. Generate the analytics " +
        "summary instead — it pages through the ballots without this limit.",
    );
  }

  // Seed every key so a candidate or position with no votes reports 0 rather
  // than going missing from the map.
  const candidateVotes: Record<string, number> = {};
  const positionVotes: Record<string, number> = {};
  const positionAbstains: Record<string, number> = {};
  for (const candidate of candidates) candidateVotes[candidate._id] = 0;
  for (const position of positions) {
    positionVotes[position._id] = 0;
    positionAbstains[position._id] = 0;
  }

  for (const vote of votes) {
    positionVotes[vote.positionId] = (positionVotes[vote.positionId] ?? 0) + 1;
    if (vote.candidateId === "abstain") {
      positionAbstains[vote.positionId] =
        (positionAbstains[vote.positionId] ?? 0) + 1;
    } else {
      candidateVotes[vote.candidateId] =
        (candidateVotes[vote.candidateId] ?? 0) + 1;
    }
  }

  return { candidateVotes, positionVotes, positionAbstains };
};
