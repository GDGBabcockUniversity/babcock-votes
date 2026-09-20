import { mutation } from "./_generated/server";
import { requireAdmin } from "./lib/access";

/** Admins upload candidate photos and election logos straight to Convex storage. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});
