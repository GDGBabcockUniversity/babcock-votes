import Google from "@auth/core/providers/google";
import { Email } from "@convex-dev/auth/providers/Email";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { SCHOOL_DOMAIN } from "../lib/constants";
import type { MutationCtx } from "./_generated/server";
import { createOrUpdateUser } from "./lib/authCallbacks";
import { generateVoterOtp, VOTER_OTP_MAX_AGE_S, VOTER_OTP_PROVIDER } from "./lib/voterOtp";
import { sendVoterOtpEmail } from "./lib/voterOtpEmail";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    // Students: school Google accounts only (enforced in createOrUpdateUser).
    Google({
      authorization: { params: { prompt: "select_account", hd: SCHOOL_DOMAIN } },
    }),
    // Part-time students: accounts are provisioned by an admin script; nobody
    // can self-register with a password (see createOrUpdateUser).
    Password,
    // Registered students (e.g. an imported class list): a 6-digit code
    // emailed to them. The identifier is the matric key (see lib/voterOtp.ts);
    // the default `authorize` checks the code was issued for that matric.
    Email({
      id: VOTER_OTP_PROVIDER,
      maxAge: VOTER_OTP_MAX_AGE_S,
      generateVerificationToken: generateVoterOtp,
      sendVerificationRequest: sendVoterOtpEmail,
    }),
  ],
  callbacks: {
    // The sign-in gate and account linking live in lib/authCallbacks.ts so they
    // can be unit tested. Convex Auth types the context for an untyped data
    // model; at runtime it is the same mutation context.
    createOrUpdateUser: (ctx, args) =>
      createOrUpdateUser(ctx as unknown as MutationCtx, args as Parameters<typeof createOrUpdateUser>[1]),
  },
});
