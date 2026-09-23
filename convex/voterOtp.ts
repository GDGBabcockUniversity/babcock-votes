import { v } from "convex/values";
import { internalQuery, query } from "./_generated/server";
import { maskEmail, prepareVoterOtpEmail, requireOtpUser } from "./lib/voterOtp";

/**
 * For the signed-out register page: where a matric's code would be sent,
 * masked. No auth, so it reveals nothing beyond the masked address.
 */
export const lookup = query({
  args: { matric: v.string(), fullName: v.string() },
  handler: async (ctx, args) => {
    const user = await requireOtpUser(ctx, args.matric);
    if (user.fullName?.trim().replace(/\s+/g, " ").toLowerCase() !== args.fullName.trim().replace(/\s+/g, " ").toLowerCase()) {
      throw new Error("The full name does not match the matric number.");
    }
    return { maskedEmail: maskEmail(user.email) };
  },
});

/** Called by the `voter-otp` provider's `sendVerificationRequest` in auth.ts. */
export const prepareEmail = internalQuery({
  args: { matricKey: v.string() },
  handler: (ctx, args) => prepareVoterOtpEmail(ctx, args.matricKey),
});
