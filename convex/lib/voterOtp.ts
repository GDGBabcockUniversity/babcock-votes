import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { MATRIC_REGEX } from "../../lib/constants";
import { matricFromDocId } from "../../lib/matric";
import { isRegistered, type RegisteredUser } from "./access";

/**
 * One-time codes emailed to registered students, such as a class list
 * imported with `scripts/import-class-list.mjs` (users with their personal
 * email). A matric number leads to its user through `users.matricNumber`.
 *
 * The flow, as Convex Auth runs it for the `voter-otp` Email provider:
 * 1. The register page calls `signIn("voter-otp", { email: matricKey })`.
 *    Convex Auth calls `createOrUpdateUser` with type "email"
 *    (`requestVoterOtp` below: finds the user, limits resends), then stores
 *    a fresh code, deleting any earlier one for the matric.
 * 2. The provider's `sendVerificationRequest` emails the code to the user's
 *    email (see `prepareVoterOtpEmail`).
 * 3. The student enters it: `signIn("voter-otp", { email: matricKey, code })`.
 *    Convex Auth checks the code belongs to that matric, hasn't expired and
 *    hasn't been used, and limits wrong guesses per matric, then signs into
 *    the user.
 *
 * The identifier is the matric key, so the browser never sees the email.
 */

export const VOTER_OTP_PROVIDER = "voter-otp";

export const VOTER_OTP_DIGITS = 6;

/** How long a code stays valid. */
export const VOTER_OTP_MAX_AGE_S = 60 * 60;

/** At most one code per matric in this window. */
export const VOTER_OTP_RESEND_MS = 60 * 1000;

export const NOT_LISTED =
  "You are not listed as an eligible voter. Please contact your association admin.";

export const NO_EMAIL =
  "We don't have an email address for this matric number. Please contact your association admin.";

/** A uniformly random 6-digit code, e.g. "042917". */
export const generateVoterOtp = () => {
  const limit = 10 ** VOTER_OTP_DIGITS;
  // Largest multiple of `limit` below 2^32, so every code is equally likely.
  const max = Math.floor(0x1_0000_0000 / limit) * limit;
  const buffer = new Uint32Array(1);
  do crypto.getRandomValues(buffer);
  while (buffer[0] >= max);
  return String(buffer[0] % limit).padStart(VOTER_OTP_DIGITS, "0");
};

/** "21/0456", "21-0456" or "PT/22/2222" -> the matric key, or null if it isn't a matric. */
export const toMatricKey = (value: string) => {
  const matric = matricFromDocId(value.trim());
  return MATRIC_REGEX.test(matric) ? matric.replace(/\//g, "-").toLowerCase() : null;
};

/**
 * Users with this matric number. Stored as typed, so both the upper- and
 * lower-case forms are checked ("PT/22/2222" vs "pt/22/2222").
 */
export const findUsersByMatric = async (ctx: QueryCtx, matricNumber: string) => {
  const forms = [...new Set([matricNumber.toUpperCase(), matricNumber.toLowerCase()])];
  const found = await Promise.all(
    forms.map((form) =>
      ctx.db
        .query("users")
        .withIndex("by_matric_number", (q) => q.eq("matricNumber", form))
        .take(2),
    ),
  );
  return found.flat();
};

/** The registered user holding a matric (in any accepted form), who must have an email. */
export const requireOtpUser = async (ctx: QueryCtx, matric: string) => {
  const matricKey = toMatricKey(matric);
  const users = matricKey
    ? (await findUsersByMatric(ctx, matricFromDocId(matricKey))).filter(isRegistered)
    : [];
  // None, or ambiguous: don't guess whose inbox to send a sign-in code to.
  if (users.length !== 1) throw new ConvexError(NOT_LISTED);
  const [user] = users;
  if (!user.email) throw new ConvexError(NO_EMAIL);
  return user as RegisteredUser & { email: string };
};

/** "olamide@gmail.com" -> "o****e@gmail.com". */
export const maskEmail = (email: string) => {
  const [local, domain] = email.split("@");
  if (!domain) return "****";
  const masked =
    local.length <= 2 ? `${local[0] ?? ""}****` : `${local[0]}****${local[local.length - 1]}`;
  return `${masked}@${domain}`;
};

/**
 * Step 1: someone asked for a code for `matricKey`. Returns the user it signs
 * into. Runs before Convex Auth replaces the matric's previous code, so that
 * code still tells us when it was sent, and a refused resend leaves it valid.
 */
export const requestVoterOtp = async (
  ctx: MutationCtx,
  matricKey: string | undefined,
): Promise<Id<"users">> => {
  // Only the canonical key, so "21/0456" and "21-0456" can't become two accounts.
  if (!matricKey || toMatricKey(matricKey) !== matricKey) throw new ConvexError(NOT_LISTED);
  const user = await requireOtpUser(ctx, matricKey);

  const account = await ctx.db
    .query("authAccounts")
    .withIndex("providerAndAccountId", (q) =>
      q.eq("provider", VOTER_OTP_PROVIDER).eq("providerAccountId", matricKey),
    )
    .unique();
  const pending = account
    ? await ctx.db
        .query("authVerificationCodes")
        .withIndex("accountId", (q) => q.eq("accountId", account._id))
        .unique()
    : null;
  if (pending) {
    const sentAt = pending.expirationTime - VOTER_OTP_MAX_AGE_S * 1000;
    const wait = VOTER_OTP_RESEND_MS - (Date.now() - sentAt);
    if (wait > 0) {
      throw new ConvexError(
        `A code was just sent. Please wait ${Math.ceil(wait / 1000)} seconds before requesting another.`,
      );
    }
  }

  return user._id;
};

/** What `sendVerificationRequest` needs: who to email. */
export const prepareVoterOtpEmail = async (ctx: QueryCtx, matricKey: string) => {
  const user = await requireOtpUser(ctx, matricKey);
  return { to: user.email, fullName: user.fullName };
};
