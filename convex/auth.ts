import Google from "@auth/core/providers/google";
import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { SCHOOL_DOMAIN } from "../lib/constants";
import { internal } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";
import { createOrUpdateUser } from "./lib/authCallbacks";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    // Students: school Google accounts only (enforced in createOrUpdateUser).
    Google({
      authorization: { params: { prompt: "select_account", hd: SCHOOL_DOMAIN } },
    }),
    // Part-time students: accounts are provisioned by an admin script; nobody
    // can self-register with a password (see createOrUpdateUser).
    Password,
    // Matric number or email, plus full name (see lib/identitySignIn.ts).
    ConvexCredentials({
      id: "identity",
      authorize: async (credentials, ctx) => {
        const str = (value: unknown) => (typeof value === "string" ? value : undefined);
        const userId = await ctx.runMutation(internal.identitySignIn.resolve, {
          matric: str(credentials.matric),
          email: str(credentials.email),
          fullName: str(credentials.fullName) ?? "",
        });
        return { userId };
      },
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
