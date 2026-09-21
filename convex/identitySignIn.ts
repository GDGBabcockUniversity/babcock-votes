import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { resolveIdentity } from "./lib/identitySignIn";

/** Called by the `identity` sign-in provider in auth.ts. */
export const resolve = internalMutation({
  args: {
    matric: v.optional(v.string()),
    email: v.optional(v.string()),
    fullName: v.string(),
  },
  handler: (ctx, args) => resolveIdentity(ctx, args),
});
