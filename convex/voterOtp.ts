import { v } from "convex/values";
import { internalQuery, query } from "./_generated/server";
import { maskEmail, prepareVoterOtpEmail, requireOtpUser } from "./lib/voterOtp";

/**
 * For the signed-out register page: where a matric's code would be sent,
 * masked. No auth, so it reveals nothing beyond the masked address.
 */
export const lookup = query({
  args: { matric: v.string() },
  handler: async (ctx, args) => {
    const user = await requireOtpUser(ctx, args.matric);
    return { maskedEmail: maskEmail(user.email) };
  },
});

/** Called by the `voter-otp` provider's `sendVerificationRequest` in auth.ts. */
export const prepareEmail = internalQuery({
  args: { matricKey: v.string() },
  handler: (ctx, args) => prepareVoterOtpEmail(ctx, args.matricKey),
});
