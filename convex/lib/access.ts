import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;

/** Errors thrown with this reach the browser as `error.data` (a readable message). */
export const fail = (message: string) => new ConvexError(message);

export type RegisteredUser = Doc<"users"> & {
  role: NonNullable<Doc<"users">["role"]>;
  fullName: string;
  matricNumber: string;
  departmentId: string;
  level: string;
};

/** A user is "registered" once registration filled in their voter profile. */
export const isRegistered = (
  user: Doc<"users"> | null,
): user is RegisteredUser =>
  !!user &&
  !!user.role &&
  !!user.fullName &&
  !!user.matricNumber &&
  !!user.departmentId &&
  !!user.level;

/** The signed-in user's document, or null. */
export const getViewer = async (ctx: Ctx) => {
  const userId = await getAuthUserId(ctx);
  return userId ? await ctx.db.get(userId) : null;
};

export const requireSignedIn = async (ctx: Ctx) => {
  const viewer = await getViewer(ctx);
  if (!viewer) throw fail("You must be signed in.");
  return viewer;
};

export const requireRegistered = async (ctx: Ctx) => {
  const viewer = await requireSignedIn(ctx);
  if (!isRegistered(viewer)) throw fail("Please complete registration first.");
  return viewer;
};

/**
 * Require an admin. `super_admin` may act anywhere; `dept_admin` only on their
 * own department (when `departmentId` is given) and never when `superOnly`.
 * `users.role` is the single source of truth.
 */
export const requireAdmin = async (
  ctx: Ctx,
  options: { departmentId?: string; superOnly?: boolean } = {},
) => {
  const viewer = await getViewer(ctx);
  if (!isRegistered(viewer)) throw fail("Forbidden.");
  if (viewer.role === "super_admin") return viewer;

  if (
    viewer.role !== "dept_admin" ||
    options.superOnly ||
    (options.departmentId && options.departmentId !== viewer.departmentId)
  ) {
    throw fail("Forbidden.");
  }
  return viewer;
};

/**
 * Require someone allowed to see an election's live results: an admin who may
 * manage it, or a `viewer` whose department is the election's department.
 */
export const requireResultsAccess = async (ctx: Ctx, departmentId: string) => {
  const viewer = await getViewer(ctx);
  if (isRegistered(viewer) && viewer.role === "viewer") {
    if (viewer.departmentId !== departmentId) throw fail("Forbidden.");
    return viewer;
  }
  return requireAdmin(ctx, { departmentId });
};
