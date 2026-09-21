import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { fail, getViewer, isRegistered, requireAdmin } from "./lib/access";
import { role } from "./schema";
import { matricToDocId } from "../lib/matric";

/** The signed-in user plus their voter profile (null until registered). */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await getViewer(ctx);
    if (!viewer) return null;

    return {
      authUser: { id: viewer._id, email: viewer.email ?? "" },
      profile: isRegistered(viewer)
        ? {
            email: viewer.email ?? "",
            fullName: viewer.fullName,
            matricNumber: viewer.matricNumber,
            departmentId: viewer.departmentId,
            level: viewer.level,
            role: viewer.role,
            createdAt: viewer.registeredAt ?? viewer._creationTime,
          }
        : null,
    };
  },
});

/** Every registered user, newest first. Any admin may read them (as with the old rules). */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").collect();

    return users
      .filter(isRegistered)
      .map((u) => ({
        uid: u._id,
        email: u.email ?? "",
        fullName: u.fullName,
        matricNumber: u.matricNumber,
        departmentId: u.departmentId,
        level: u.level,
        role: u.role,
        createdAt: u.registeredAt ?? u._creationTime,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const setRole = mutation({
  args: { userId: v.id("users"), role },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, { superOnly: true });
    if (args.userId === admin._id) throw fail("You cannot change your own role.");

    const target = await ctx.db.get(args.userId);
    if (!isRegistered(target)) throw fail("User not found.");
    await ctx.db.patch(args.userId, { role: args.role });
  },
});

/** For `scripts/seed-users.mjs`: `npx convex run users:setRoleByEmail '{"email":"…","role":"super_admin"}'`. */
export const setRoleByEmail = internalMutation({
  args: { email: v.string(), role },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email.toLowerCase()))
      .unique();
    if (!isRegistered(user)) {
      throw new Error(
        `No registered user with email ${args.email}. They must sign in and complete registration first.`,
      );
    }
    await ctx.db.patch(user._id, { role: args.role });
  },
});

/**
 * Admin utility: delete a user and everything that signs them in, and free the
 * whitelist row they claimed. Run with
 * `npx convex run users:removeByEmail '{"email":"someone@example.com"}'`.
 * Their votes are left alone (voting history isn't rewritten).
 */
export const removeByEmail = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();
    if (!user) return { removed: false };

    const [accounts, sessions] = await Promise.all([
      ctx.db.query("authAccounts").withIndex("userIdAndProvider", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("authSessions").withIndex("userId", (q) => q.eq("userId", user._id)).collect(),
    ]);
    for (const doc of [...accounts, ...sessions]) await ctx.db.delete(doc._id);

    if (user.matricNumber) {
      const matricKey = matricToDocId(user.matricNumber);
      const voter = await ctx.db
        .query("eligibleVoters")
        .withIndex("by_matric_key", (q) => q.eq("matricKey", matricKey))
        .unique();
      if (voter?.claimedByUserId === user._id) {
        await ctx.db.patch(voter._id, { claimedByUserId: undefined, claimedEmail: undefined });
      }
    }

    await ctx.db.delete(user._id);
    return { removed: true, accounts: accounts.length, sessions: sessions.length };
  },
});
