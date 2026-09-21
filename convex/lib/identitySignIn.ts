import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { MATRIC_REGEX } from "../../lib/constants";
import { matricToDocId } from "../../lib/matric";
import { isRegistered } from "./access";

export interface IdentityCredentials {
  matric?: string;
  email?: string;
  fullName: string;
}

const NOT_FOUND =
  "We couldn't find a voter with those details. Check the spelling of your name and try again.";

/** Case, extra spaces and name order don't matter: "OBI  ada" matches "Ada Obi". */
const normalizeName = (name: string) =>
  name.trim().toLowerCase().split(/\s+/).filter(Boolean).sort().join(" ");

const namesMatch = (a: string | undefined, b: string) =>
  !!a && normalizeName(a) === normalizeName(b);

/**
 * Resolve a matric number or email plus full name to a user.
 *
 * - Matric: looked up on the eligible-voter whitelist. If the row is already
 *   claimed, that user signs in; otherwise a user is created and registered
 *   from the whitelist in the same transaction.
 * - Email: must belong to a registered user whose full name matches.
 */
export const resolveIdentity = async (
  ctx: MutationCtx,
  credentials: IdentityCredentials,
): Promise<Id<"users">> => {
  const fullName = credentials.fullName.trim();
  if (!fullName) throw new ConvexError("Please enter your full name.");

  if (credentials.matric !== undefined) {
    const matric = credentials.matric.trim();
    if (!MATRIC_REGEX.test(matric)) {
      throw new ConvexError(
        "Matric number must be in format XX/XXXX or AA/XX/XXXX (e.g., 21/0456 or PT/22/2222).",
      );
    }

    const matricKey = matricToDocId(matric);
    const voter = await ctx.db
      .query("eligibleVoters")
      .withIndex("by_matric_key", (q) => q.eq("matricKey", matricKey))
      .unique();
    if (!voter || !namesMatch(voter.fullName, fullName)) throw new ConvexError(NOT_FOUND);

    if (voter.claimedByUserId) return voter.claimedByUserId;

    // First sign-in for this matric: create the user and claim the row together.
    const userId = await ctx.db.insert("users", {
      name: voter.fullName,
      fullName: voter.fullName,
      matricNumber: matric,
      departmentId: voter.departmentId,
      level: voter.level,
      role: "voter",
      registeredAt: Date.now(),
    });
    await ctx.db.patch(voter._id, { claimedByUserId: userId });
    return userId;
  }

  const email = credentials.email?.trim().toLowerCase();
  if (!email) throw new ConvexError("Please enter your matric number or email.");

  const users = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .collect();
  const user = users.find((u) => isRegistered(u) && namesMatch(u.fullName, fullName));
  if (!user) throw new ConvexError(NOT_FOUND);
  return user._id;
};
