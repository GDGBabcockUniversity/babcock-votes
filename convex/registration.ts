import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { fail, isRegistered, requireSignedIn } from "./lib/access";
import { MATRIC_REGEX, SCHOOL_DOMAIN } from "../lib/constants";
import { matricToDocId } from "../lib/matric";

/**
 * Shared by `lookup` and `register`: the caller must be a school account that
 * hasn't registered yet, and the matric must be listed and unclaimed.
 */
const resolveEligibleVoter = async (
  ctx: QueryCtx,
  viewer: Doc<"users">,
  matric: string,
) => {
  if (isRegistered(viewer)) {
    throw fail("You have already completed registration.");
  }
  // The auth callback already gates account creation; this also covers
  // accounts that predate it.
  if (!viewer.email?.endsWith(`@${SCHOOL_DOMAIN}`)) {
    throw fail(
      `Only @${SCHOOL_DOMAIN} email addresses are allowed. Please sign in with your school email.`,
    );
  }

  const safeMatric = matric.trim();
  if (!MATRIC_REGEX.test(safeMatric)) {
    throw fail(
      "Matric number must be in format XX/XXXX or AA/XX/XXXX (e.g., 21/0456 or PT/22/2222).",
    );
  }

  const matricKey = matricToDocId(safeMatric);
  const voter = await ctx.db
    .query("eligibleVoters")
    .withIndex("by_matric_key", (q) => q.eq("matricKey", matricKey))
    .unique();

  if (!voter) {
    throw fail(
      "You are not listed as an eligible voter. Please contact your association admin.",
    );
  }
  if (voter.claimedByUserId) {
    throw fail(
      "This matric number has already been registered. If this is an error, please contact your association admin.",
    );
  }

  return { voter, safeMatric };
};

export const lookup = query({
  args: { matric: v.string() },
  handler: async (ctx, args) => {
    const viewer = await requireSignedIn(ctx);
    const { voter } = await resolveEligibleVoter(ctx, viewer, args.matric);
    return {
      fullName: voter.fullName,
      departmentId: voter.departmentId,
      level: voter.level,
    };
  },
});

/**
 * Claim the eligible-voter record and fill in the user's profile in one
 * transaction. Two people claiming the same matric conflict and the loser
 * retries into the "already registered" error.
 */
export const register = mutation({
  args: { matric: v.string() },
  handler: async (ctx, args) => {
    const viewer = await requireSignedIn(ctx);
    const { voter, safeMatric } = await resolveEligibleVoter(
      ctx,
      viewer,
      args.matric,
    );

    await ctx.db.patch(voter._id, {
      claimedByUserId: viewer._id,
      claimedEmail: viewer.email,
    });
    await ctx.db.patch(viewer._id, {
      fullName: voter.fullName,
      matricNumber: safeMatric,
      departmentId: voter.departmentId,
      level: voter.level,
      role: "voter",
      registeredAt: Date.now(),
    });
  },
});
