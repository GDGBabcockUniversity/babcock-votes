import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { fail, requireAdmin, requireResultsAccess } from "./lib/access";
import * as validate from "./lib/validate";
import { MATRIC_REGEX } from "../lib/constants";
import { matricFromDocId, matricToDocId } from "../lib/matric";

/** The whitelist for one department. Any admin may read it; only super admins change it. */
export const listByDepartment = query({
  args: { departmentId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const voters = await ctx.db
      .query("eligibleVoters")
      .withIndex("by_department", (q) => q.eq("departmentId", args.departmentId))
      .collect();

    return voters
      .map((voter) => ({
        docId: voter._id,
        matricNumber: matricFromDocId(voter.matricKey),
        fullName: voter.fullName,
        departmentId: voter.departmentId,
        level: voter.level,
        claimedByUid: voter.claimedByUserId ?? null,
        claimedEmail: voter.claimedEmail ?? null,
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  },
});

/** For turnout on the results page, so department viewers may read it too. */
export const countByDepartment = query({
  args: { departmentId: v.string() },
  handler: async (ctx, args) => {
    await requireResultsAccess(ctx, args.departmentId);
    const voters = await ctx.db
      .query("eligibleVoters")
      .withIndex("by_department", (q) => q.eq("departmentId", args.departmentId))
      .collect();
    return voters.length;
  },
});

export const create = mutation({
  args: {
    matric: v.string(),
    fullName: v.string(),
    departmentId: v.string(),
    level: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, { superOnly: true });

    const matric = args.matric.trim();
    if (!MATRIC_REGEX.test(matric)) throw fail("Invalid matric number format.");
    const matricKey = matricToDocId(matric);

    const existing = await ctx.db
      .query("eligibleVoters")
      .withIndex("by_matric_key", (q) => q.eq("matricKey", matricKey))
      .unique();
    if (existing) throw fail("A voter with this matric number already exists.");

    await ctx.db.insert("eligibleVoters", {
      matricKey,
      fullName: validate.text(args.fullName, "Full name"),
      departmentId: validate.departmentId(args.departmentId),
      level: validate.level(args.level),
    });
  },
});

export const update = mutation({
  args: { docId: v.id("eligibleVoters"), fullName: v.string(), level: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, { superOnly: true });
    if (!(await ctx.db.get(args.docId))) throw fail("Voter not found.");

    await ctx.db.patch(args.docId, {
      fullName: validate.text(args.fullName, "Full name"),
      level: validate.level(args.level),
    });
  },
});

export const remove = mutation({
  args: { docId: v.id("eligibleVoters") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, { superOnly: true });
    await ctx.db.delete(args.docId);
  },
});
