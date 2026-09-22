import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { PART_TIME_EMAIL_DOMAIN, SCHOOL_DOMAIN } from "../../lib/constants";
import { requestVoterOtp, requireOtpUser, VOTER_OTP_PROVIDER } from "./voterOtp";

export interface CreateOrUpdateUserArgs {
  /** Set when this sign-in belongs to an account that already exists. */
  existingUserId: Id<"users"> | null;
  type: "oauth" | "credentials" | "email" | "phone" | "verification";
  provider?: { id: string };
  profile: Record<string, unknown> & {
    email?: string;
    emailVerified?: boolean;
  };
  /** Passed by `createAccount(…, { shouldLinkViaEmail })`; the type says `shouldLink`, the runtime says both. */
  shouldLink?: boolean;
  shouldLinkViaEmail?: boolean;
}

const INVALID_CREDENTIALS =
  "Invalid email or password. Please check your credentials and try again.";

/**
 * The gate for every sign-in that isn't already tied to a user.
 *
 * Convex Auth only links accounts by verified email when it creates users
 * itself; once a `createOrUpdateUser` callback is provided, linking is our job
 * ("completely control account linking"). Without the linking below, a
 * migrated student's first Google sign-in would create a second, empty user
 * and they'd lose their profile and voting history.
 *
 * - Google: school emails only (Google's `hd` hint is a UI nicety, this is the
 *   real check). Trusted, so it attaches to the one existing user with that
 *   verified email (a migrated student) instead of creating a duplicate.
 * - Password: accounts are provisioned by `createAccount` from our own server
 *   code (`convex/ops.ts`), which passes `shouldLinkViaEmail`. The public
 *   password sign-up form doesn't, so nobody can self-register with a password.
 * - Voter OTP: a code emailed to a registered student (e.g. from an imported
 *   class list); see lib/voterOtp.ts. `profile.email` is the matric key.
 */
export const createOrUpdateUser = async (
  ctx: MutationCtx,
  args: CreateOrUpdateUserArgs,
): Promise<Id<"users">> => {
  if (args.provider?.id === VOTER_OTP_PROVIDER) {
    const matricKey = typeof args.profile.email === "string" ? args.profile.email : undefined;
    if (args.type === "email") return requestVoterOtp(ctx, matricKey);
    // The code was accepted: sign into whoever holds the matric now.
    if (args.type === "verification") return (await requireOtpUser(ctx, matricKey ?? ""))._id;
    throw new ConvexError(INVALID_CREDENTIALS);
  }

  if (args.existingUserId) return args.existingUserId;

  const profile = args.profile as {
    email?: string;
    name?: string;
    image?: string;
    emailVerified?: boolean;
    /** Set when an account is created with `createAccount` (see convex/ops.ts). */
    emailVerificationTime?: number;
  };
  const email = profile.email?.toLowerCase();
  const provisioned = !!(args.shouldLink || args.shouldLinkViaEmail);

  if (args.type === "oauth") {
    if (!email?.endsWith(`@${SCHOOL_DOMAIN}`)) {
      throw new ConvexError(
        `Only @${SCHOOL_DOMAIN} email addresses are allowed. Please sign in with your school email.`,
      );
    }
  } else if (args.type === "credentials") {
    if (!provisioned || !email?.endsWith(`@${PART_TIME_EMAIL_DOMAIN}`)) {
      throw new ConvexError(INVALID_CREDENTIALS);
    }
  } else {
    throw new ConvexError(INVALID_CREDENTIALS);
  }

  // Attach to the single existing user whose email is already verified.
  const matches = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .filter((q) => q.neq(q.field("emailVerificationTime"), undefined))
    .take(2);
  if (matches.length === 1) return matches[0]._id;

  return ctx.db.insert("users", {
    email,
    name: profile.name,
    image: profile.image,
    // Google vouches for the address; provisioned accounts say so explicitly.
    emailVerificationTime: profile.emailVerificationTime ?? Date.now(),
  });
};
