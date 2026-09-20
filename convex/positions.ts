import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, type MutationCtx } from "./_generated/server";
import { fail, requireAdmin } from "./lib/access";
import * as validate from "./lib/validate";
import { deleteFile } from "./elections";

const fields = {
  title: v.string(),
  description: v.string(),
  order: v.number(),
  allowedLevels: v.array(v.string()),
};

const clean = (args: {
  title: string;
  description: string;
  order: number;
  allowedLevels: string[];
}) => {
  if (!Number.isInteger(args.order)) throw fail("Order must be a whole number.");
  return {
    title: validate.text(args.title, "Title"),
    description: validate.optionalText(args.description, "Description"),
    order: args.order,
    allowedLevels: args.allowedLevels.map(validate.level),
  };
};

const requirePositionAdmin = async (ctx: MutationCtx, id: Id<"positions">) => {
  const position = await ctx.db.get(id);
  if (!position) throw fail("Position not found.");
  const election = await ctx.db.get(position.electionId);
  if (!election) throw fail("Election not found.");
  await requireAdmin(ctx, { departmentId: election.departmentId });
  return { position, election };
};

export const create = mutation({
  args: { electionId: v.id("elections"), ...fields },
  handler: async (ctx, args) => {
    const election = await ctx.db.get(args.electionId);
    if (!election) throw fail("Election not found.");
    await requireAdmin(ctx, { departmentId: election.departmentId });

    const { electionId, ...rest } = args;
    return ctx.db.insert("positions", { electionId, ...clean(rest) });
  },
});

export const update = mutation({
  args: { id: v.id("positions"), ...fields },
  handler: async (ctx, args) => {
    await requirePositionAdmin(ctx, args.id);
    const { id, ...rest } = args;
    await ctx.db.patch(id, clean(rest));
  },
});

/** Deleting a position also deletes its candidates. */
export const remove = mutation({
  args: { id: v.id("positions") },
  handler: async (ctx, args) => {
    const { position, election } = await requirePositionAdmin(ctx, args.id);

    const candidates = await ctx.db
      .query("candidates")
      .withIndex("by_position", (q) => q.eq("positionId", position._id))
      .collect();

    for (const candidate of candidates) {
      // Demo elections share photo files with the source election.
      if (!election.isDuplicate) await deleteFile(ctx, candidate.photoStorageId);
      await ctx.db.delete(candidate._id);
    }
    await ctx.db.delete(position._id);

    const remaining = await ctx.db
      .query("candidates")
      .withIndex("by_election", (q) => q.eq("electionId", election._id))
      .collect();
    await ctx.db.patch(election._id, { candidateCount: remaining.length });
  },
});
