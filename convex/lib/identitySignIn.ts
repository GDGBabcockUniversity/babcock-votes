import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { isRegistered } from "./access";

export interface IdentityCredentials {
  email: string;
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
 * Resolve an email plus full name to a user. The email must belong to a
 * registered user whose full name matches; new students register after signing
 * in with Google.
 */
export const resolveIdentity = async (
  ctx: MutationCtx,
  credentials: IdentityCredentials,
): Promise<Id<"users">> => {
  const fullName = credentials.fullName.trim();
  if (!fullName) throw new ConvexError("Please enter your full name.");

  const email = credentials.email.trim().toLowerCase();
  if (!email) throw new ConvexError("Please enter your email.");

  const users = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .collect();
  const user = users.find((u) => isRegistered(u) && namesMatch(u.fullName, fullName));
  if (!user) throw new ConvexError(NOT_FOUND);
  return user._id;
};
