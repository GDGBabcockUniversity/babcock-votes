/**
 * Operations for the maintenance scripts in `scripts/` and the one-off
 * Firebase migration. These are public functions only because
 * `ConvexHttpClient` can't call internal ones, so every one of them requires
 * the deployment's `OPS_SECRET` (set with `npx convex env set OPS_SECRET …`).
 * Unset the secret to switch them all off.
 */

import { createAccount } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { castBallot } from "./lib/ballot";
import { findUsersByMatric } from "./lib/voterOtp";
import { isRegistered, type RegisteredUser } from "./lib/access";
import * as validate from "./lib/validate";
import { MATRIC_REGEX } from "../lib/constants";
import { matricToDocId } from "../lib/matric";
import { role, electionStatus } from "./schema";

const assertOps = (secret: string) => {
  const expected = process.env.OPS_SECRET;
  if (!expected || secret !== expected) throw new Error("Forbidden.");
};

// --- Legacy ID resolution (migration) ------------------------------------------

const legacyResolvers = (ctx: QueryCtx) => {
  const caches = {
    users: new Map<string, Id<"users"> | null>(),
    elections: new Map<string, Id<"elections"> | null>(),
    positions: new Map<string, Id<"positions"> | null>(),
    candidates: new Map<string, Id<"candidates"> | null>(),
  };

  const cached = async <K extends keyof typeof caches>(
    table: K,
    legacyId: string,
    lookup: () => Promise<{ _id: Id<K> } | null>,
  ) => {
    const cache = caches[table] as Map<string, Id<K> | null>;
    if (cache.has(legacyId)) return cache.get(legacyId)!;
    const found = (await lookup())?._id ?? null;
    cache.set(legacyId, found);
    return found;
  };

  return {
    user: (legacyId: string) =>
      cached("users", legacyId, () =>
        ctx.db.query("users").withIndex("by_legacy_id", (q) => q.eq("legacyId", legacyId)).unique(),
      ),
    election: (legacyId: string) =>
      cached("elections", legacyId, () =>
        ctx.db.query("elections").withIndex("by_legacy_id", (q) => q.eq("legacyId", legacyId)).unique(),
      ),
    position: (legacyId: string) =>
      cached("positions", legacyId, () =>
        ctx.db.query("positions").withIndex("by_legacy_id", (q) => q.eq("legacyId", legacyId)).unique(),
      ),
    candidate: (legacyId: string) =>
      cached("candidates", legacyId, () =>
        ctx.db.query("candidates").withIndex("by_legacy_id", (q) => q.eq("legacyId", legacyId)).unique(),
      ),
  };
};

// --- Migration -------------------------------------------------------------------

export const migrationUploadUrl = mutation({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    assertOps(args.secret);
    return await ctx.storage.generateUploadUrl();
  },
});

export const migrateUsers = mutation({
  args: {
    secret: v.string(),
    rows: v.array(
      v.object({
        legacyId: v.string(),
        email: v.string(),
        name: v.optional(v.string()),
        fullName: v.string(),
        matricNumber: v.string(),
        departmentId: v.string(),
        level: v.string(),
        role,
        createdAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    assertOps(args.secret);
    let created = 0;
    let updated = 0;

    for (const row of args.rows) {
      const email = row.email.toLowerCase();
      const fields = {
        email,
        name: row.name,
        // Verified, so a first Google sign-in with this email links to this user.
        emailVerificationTime: row.createdAt,
        fullName: row.fullName,
        matricNumber: row.matricNumber,
        departmentId: row.departmentId,
        level: row.level,
        role: row.role,
        registeredAt: row.createdAt,
        legacyId: row.legacyId,
      };

      const existing =
        (await ctx.db
          .query("users")
          .withIndex("by_legacy_id", (q) => q.eq("legacyId", row.legacyId))
          .unique()) ??
        (await ctx.db
          .query("users")
          .withIndex("email", (q) => q.eq("email", email))
          .first());

      if (existing) {
        await ctx.db.patch(existing._id, fields);
        updated++;
      } else {
        await ctx.db.insert("users", fields);
        created++;
      }
    }
    return { created, updated };
  },
});

export const migrateEligibleVoters = mutation({
  args: {
    secret: v.string(),
    rows: v.array(
      v.object({
        matricKey: v.string(),
        fullName: v.string(),
        departmentId: v.string(),
        level: v.string(),
        claimedByLegacyUid: v.optional(v.string()),
        claimedEmail: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    assertOps(args.secret);
    const resolve = legacyResolvers(ctx);
    let created = 0;
    let updated = 0;
    const unresolvedClaims: string[] = [];

    for (const row of args.rows) {
      const claimedByUserId = row.claimedByLegacyUid
        ? ((await resolve.user(row.claimedByLegacyUid)) ?? undefined)
        : undefined;
      if (row.claimedByLegacyUid && !claimedByUserId) unresolvedClaims.push(row.matricKey);

      const fields = {
        matricKey: row.matricKey,
        fullName: row.fullName,
        departmentId: row.departmentId,
        level: row.level,
        claimedByUserId,
        claimedEmail: row.claimedEmail?.toLowerCase(),
      };

      const existing = await ctx.db
        .query("eligibleVoters")
        .withIndex("by_matric_key", (q) => q.eq("matricKey", row.matricKey))
        .unique();
      if (existing) {
        await ctx.db.replace(existing._id, fields);
        updated++;
      } else {
        await ctx.db.insert("eligibleVoters", fields);
        created++;
      }
    }
    return { created, updated, unresolvedClaims };
  },
});

export const migrateElections = mutation({
  args: {
    secret: v.string(),
    rows: v.array(
      v.object({
        legacyId: v.string(),
        title: v.string(),
        description: v.string(),
        departmentId: v.string(),
        status: electionStatus,
        startDate: v.number(),
        endDate: v.number(),
        candidateCount: v.number(),
        createdByLegacyId: v.optional(v.string()),
        createdAt: v.number(),
        isDuplicate: v.optional(v.boolean()),
        duplicatedFromLegacyId: v.optional(v.string()),
        duplicatedAt: v.optional(v.number()),
        duplicatedByLegacyId: v.optional(v.string()),
        logoStorageId: v.optional(v.id("_storage")),
      }),
    ),
  },
  handler: async (ctx, args) => {
    assertOps(args.secret);
    const resolve = legacyResolvers(ctx);

    // `createdBy` is required; elections whose creator wasn't migrated fall back to a super admin.
    const fallbackAdmin = (await ctx.db.query("users").collect()).find(
      (u) => u.role === "super_admin",
    );
    let created = 0;
    let updated = 0;
    const notes: string[] = [];

    for (const row of args.rows) {
      const createdBy =
        (row.createdByLegacyId ? await resolve.user(row.createdByLegacyId) : null) ??
        fallbackAdmin?._id;
      if (!createdBy) {
        throw new Error("No user to attribute elections to: migrate users (with a super admin) first.");
      }
      if (row.createdByLegacyId && !(await resolve.user(row.createdByLegacyId))) {
        notes.push(`${row.title}: creator not found, attributed to a super admin`);
      }
      const duplicatedBy = row.duplicatedByLegacyId
        ? ((await resolve.user(row.duplicatedByLegacyId)) ?? undefined)
        : undefined;

      const fields = {
        title: row.title,
        description: row.description,
        departmentId: row.departmentId,
        status: row.status,
        startDate: row.startDate,
        endDate: row.endDate,
        candidateCount: row.candidateCount,
        createdBy,
        createdAt: row.createdAt,
        isDuplicate: row.isDuplicate,
        duplicatedAt: row.duplicatedAt,
        duplicatedBy,
        logoStorageId: row.logoStorageId,
        legacyId: row.legacyId,
      };

      const existing = await ctx.db
        .query("elections")
        .withIndex("by_legacy_id", (q) => q.eq("legacyId", row.legacyId))
        .unique();
      if (existing) {
        await ctx.db.replace(existing._id, {
          ...fields,
          duplicatedFromElectionId: existing.duplicatedFromElectionId,
        });
        updated++;
      } else {
        await ctx.db.insert("elections", fields);
        created++;
      }
    }

    // Second pass: point demo elections at their source (it may be later in the batch).
    for (const row of args.rows) {
      if (!row.duplicatedFromLegacyId) continue;
      const election = await resolve.election(row.legacyId);
      const source = await resolve.election(row.duplicatedFromLegacyId);
      if (election && source) await ctx.db.patch(election, { duplicatedFromElectionId: source });
    }

    return { created, updated, notes };
  },
});

export const migratePositions = mutation({
  args: {
    secret: v.string(),
    rows: v.array(
      v.object({
        legacyId: v.string(),
        electionLegacyId: v.string(),
        title: v.string(),
        description: v.string(),
        order: v.number(),
        allowedLevels: v.array(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    assertOps(args.secret);
    const resolve = legacyResolvers(ctx);
    let created = 0;
    let updated = 0;
    const unresolved: string[] = [];

    for (const row of args.rows) {
      const electionId = await resolve.election(row.electionLegacyId);
      if (!electionId) {
        unresolved.push(row.legacyId);
        continue;
      }
      const fields = {
        electionId,
        title: row.title,
        description: row.description,
        order: row.order,
        allowedLevels: row.allowedLevels,
        legacyId: row.legacyId,
      };
      const existing = await ctx.db
        .query("positions")
        .withIndex("by_legacy_id", (q) => q.eq("legacyId", row.legacyId))
        .unique();
      if (existing) {
        await ctx.db.replace(existing._id, fields);
        updated++;
      } else {
        await ctx.db.insert("positions", fields);
        created++;
      }
    }
    return { created, updated, unresolved };
  },
});

export const migrateCandidates = mutation({
  args: {
    secret: v.string(),
    rows: v.array(
      v.object({
        legacyId: v.string(),
        electionLegacyId: v.string(),
        positionLegacyId: v.string(),
        fullName: v.string(),
        manifesto: v.string(),
        departmentId: v.string(),
        level: v.string(),
        photoStorageId: v.optional(v.id("_storage")),
      }),
    ),
  },
  handler: async (ctx, args) => {
    assertOps(args.secret);
    const resolve = legacyResolvers(ctx);
    let created = 0;
    let updated = 0;
    const unresolved: string[] = [];

    for (const row of args.rows) {
      const electionId = await resolve.election(row.electionLegacyId);
      const positionId = await resolve.position(row.positionLegacyId);
      if (!electionId || !positionId) {
        unresolved.push(row.legacyId);
        continue;
      }
      const fields = {
        electionId,
        positionId,
        fullName: row.fullName,
        manifesto: row.manifesto,
        departmentId: row.departmentId,
        level: row.level,
        photoStorageId: row.photoStorageId,
        legacyId: row.legacyId,
      };
      const existing = await ctx.db
        .query("candidates")
        .withIndex("by_legacy_id", (q) => q.eq("legacyId", row.legacyId))
        .unique();
      if (existing) {
        await ctx.db.replace(existing._id, fields);
        updated++;
      } else {
        await ctx.db.insert("candidates", fields);
        created++;
      }
    }
    return { created, updated, unresolved };
  },
});

/** Idempotent: a vote whose (voter, position) already exists is skipped, so re-runs never double count. */
export const migrateVotes = mutation({
  args: {
    secret: v.string(),
    rows: v.array(
      v.object({
        electionLegacyId: v.string(),
        positionLegacyId: v.string(),
        /** A candidate's legacy ID, or "abstain". */
        candidateLegacyId: v.string(),
        voterLegacyId: v.string(),
        votedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    assertOps(args.secret);
    const resolve = legacyResolvers(ctx);
    let inserted = 0;
    let skipped = 0;
    const unresolved: string[] = [];

    for (const row of args.rows) {
      const [voterId, electionId, positionId] = await Promise.all([
        resolve.user(row.voterLegacyId),
        resolve.election(row.electionLegacyId),
        resolve.position(row.positionLegacyId),
      ]);
      const candidateId =
        row.candidateLegacyId === "abstain"
          ? ("abstain" as const)
          : await resolve.candidate(row.candidateLegacyId);

      if (!voterId || !electionId || !positionId || !candidateId) {
        unresolved.push(`${row.voterLegacyId}/${row.positionLegacyId}`);
        continue;
      }

      const existing = await ctx.db
        .query("votes")
        .withIndex("by_voter_position", (q) => q.eq("voterId", voterId).eq("positionId", positionId))
        .first();
      if (existing) {
        skipped++;
        continue;
      }

      await ctx.db.insert("votes", {
        electionId,
        positionId,
        candidateId,
        voterId,
        votedAt: row.votedAt,
      });
      inserted++;
    }

    return { inserted, skipped, unresolved };
  },
});

/** Row counts for the migration's parity report. Votes are counted by `countVotesPage`. */
export const verifyCounts = query({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    assertOps(args.secret);
    const [users, eligibleVoters, elections, positions, candidates] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("eligibleVoters").collect(),
      ctx.db.query("elections").collect(),
      ctx.db.query("positions").collect(),
      ctx.db.query("candidates").collect(),
    ]);
    return {
      users: users.filter((u) => u.role !== undefined).length,
      eligibleVoters: eligibleVoters.length,
      elections: elections.length,
      positions: positions.length,
      candidates: candidates.length,
    };
  },
});

/** Vote counts per candidate (by legacy ID), read from the votes table for comparison with Firestore. */
export const tallyByLegacy = query({
  args: { secret: v.string(), candidateLegacyIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    assertOps(args.secret);
    const resolve = legacyResolvers(ctx);
    const out: Record<string, number> = {};
    for (const legacyId of args.candidateLegacyIds) {
      const id = await resolve.candidate(legacyId);
      if (!id) {
        out[legacyId] = -1; // candidate never made it across
        continue;
      }
      const rows = await ctx.db
        .query("votes")
        .withIndex("by_candidate", (q) => q.eq("candidateId", id))
        .collect();
      out[legacyId] = rows.length;
    }
    return out;
  },
});

// --- Part-time accounts ---------------------------------------------------------

/**
 * Create a password account. If a verified user with this email already
 * exists (a migrated part-time student) the account links to that user.
 */
export const createPasswordAccount = action({
  args: { secret: v.string(), email: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    assertOps(args.secret);
    const email = args.email.toLowerCase();
    const { user } = await createAccount(ctx, {
      provider: "password",
      account: { id: email, secret: args.password },
      profile: { email, emailVerificationTime: Date.now() },
      shouldLinkViaEmail: true,
    });
    return { userId: user._id };
  },
});

/** Whether a password account already exists (so re-running never resets someone's password). */
export const passwordAccountExists = query({
  args: { secret: v.string(), email: v.string() },
  handler: async (ctx, args) => {
    assertOps(args.secret);
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", args.email.toLowerCase()),
      )
      .first();
    return account !== null;
  },
});

/** Provision a brand-new part-time student: account, profile, and claim of their whitelist row. */
export const createPartTimeAccount = action({
  args: {
    secret: v.string(),
    email: v.string(),
    password: v.string(),
    matricNumber: v.string(),
    fullName: v.string(),
    departmentId: v.string(),
    level: v.string(),
  },
  handler: async (ctx, args): Promise<{ userId: Id<"users"> }> => {
    assertOps(args.secret);
    const email = args.email.toLowerCase();

    // Check the whitelist first so we don't create orphan accounts.
    await ctx.runQuery(internal.ops.assertClaimable, { matricNumber: args.matricNumber });

    const { user } = await createAccount(ctx, {
      provider: "password",
      account: { id: email, secret: args.password },
      profile: { email, emailVerificationTime: Date.now() },
      // Required by the sign-in gate: only server-provisioned accounts may exist.
      shouldLinkViaEmail: true,
    });
    await ctx.runMutation(internal.ops.claimForUser, {
      userId: user._id,
      matricNumber: args.matricNumber,
      fullName: args.fullName,
      departmentId: args.departmentId,
      level: args.level,
    });
    return { userId: user._id };
  },
});

export const assertClaimable = internalQuery({
  args: { matricNumber: v.string() },
  handler: async (ctx, args) => {
    const voter = await ctx.db
      .query("eligibleVoters")
      .withIndex("by_matric_key", (q) => q.eq("matricKey", matricToDocId(args.matricNumber)))
      .unique();
    if (!voter) throw new Error(`${args.matricNumber} is not in the whitelist. Run seed-whitelist first.`);
    if (voter.claimedByUserId) throw new Error(`${args.matricNumber} is already claimed.`);
  },
});

export const claimForUser = internalMutation({
  args: {
    userId: v.id("users"),
    matricNumber: v.string(),
    fullName: v.string(),
    departmentId: v.string(),
    level: v.string(),
  },
  handler: async (ctx, args) => {
    const matricKey = matricToDocId(args.matricNumber);
    const voter = await ctx.db
      .query("eligibleVoters")
      .withIndex("by_matric_key", (q) => q.eq("matricKey", matricKey))
      .unique();
    if (!voter || voter.claimedByUserId) throw new Error("Whitelist row is missing or already claimed.");

    const user = await ctx.db.get(args.userId);
    await ctx.db.patch(voter._id, { claimedByUserId: args.userId, claimedEmail: user?.email });
    await ctx.db.patch(args.userId, {
      fullName: args.fullName,
      matricNumber: args.matricNumber,
      departmentId: args.departmentId,
      level: args.level,
      role: "voter",
      registeredAt: Date.now(),
    });
  },
});

/**
 * TEMPORARY: strips the retired `users.matricKey` field so it can be dropped
 * from the schema. Run until `isDone`, then delete this function:
 * `npx convex run ops:clearUserMatricKeys '{"cursor":null}'`
 */
export const clearUserMatricKeys = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, args) => {
    const page = await ctx.db.query("users").paginate({ cursor: args.cursor, numItems: 200 });
    let cleared = 0;
    for (const user of page.page) {
      if (user.matricKey !== undefined) {
        await ctx.db.patch(user._id, { matricKey: undefined });
        cleared++;
      }
    }
    return { cleared, continueCursor: page.continueCursor, isDone: page.isDone };
  },
});

/** For `scripts/seed-users.mjs`: set a registered user's role by email. */
export const setRoleByEmail = mutation({
  args: { secret: v.string(), email: v.string(), role },
  handler: async (ctx, args) => {
    assertOps(args.secret);
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();
    if (!user) return { status: "no-account" as const };
    if (!isRegistered(user)) return { status: "not-registered" as const };
    await ctx.db.patch(user._id, { role: args.role });
    return { status: "updated" as const };
  },
});

// --- Seeding ---------------------------------------------------------------------

/**
 * For `scripts/import-users.mjs`: create registered users, each claiming the
 * eligible-voter row for their matric (created if missing). They then sign in
 * with email + full name, or with Google (linked by verified email), so a user
 * imported without an email can't sign in.
 *
 * Idempotent: a matric that is already claimed, or an email that already
 * belongs to a user, updates that user's profile and role instead.
 */
export const importUsers = mutation({
  args: {
    secret: v.string(),
    rows: v.array(
      v.object({
        fullName: v.string(),
        matricNumber: v.string(),
        departmentId: v.string(),
        level: v.string(),
        email: v.optional(v.string()),
        role: v.optional(role),
      }),
    ),
  },
  handler: async (ctx, args) => {
    assertOps(args.secret);
    let created = 0;
    let updated = 0;
    const failed: { matricNumber: string; reason: string }[] = [];

    for (const row of args.rows) {
      const matricNumber = row.matricNumber.trim();
      try {
        if (!MATRIC_REGEX.test(matricNumber)) throw new Error("Invalid matric number format.");
        const matricKey = matricToDocId(matricNumber);
        const email = row.email?.trim().toLowerCase() || undefined;
        const profile = {
          fullName: validate.text(row.fullName, "Full name"),
          matricNumber,
          departmentId: validate.departmentId(row.departmentId),
          level: validate.level(row.level),
        };

        let voter = await ctx.db
          .query("eligibleVoters")
          .withIndex("by_matric_key", (q) => q.eq("matricKey", matricKey))
          .unique();
        const existing =
          (voter?.claimedByUserId && (await ctx.db.get(voter.claimedByUserId))) ||
          (email &&
            (await ctx.db.query("users").withIndex("email", (q) => q.eq("email", email)).first())) ||
          null;

        if (existing?.matricNumber && matricToDocId(existing.matricNumber) !== matricKey) {
          throw new Error(`Email already belongs to ${existing.matricNumber}.`);
        }

        let userId: Id<"users">;
        if (existing) {
          userId = existing._id;
          await ctx.db.patch(userId, {
            ...profile,
            ...(email && { email }),
            // Keep an existing role (e.g. an admin) unless the file sets one.
            role: row.role ?? existing.role ?? "voter",
            registeredAt: existing.registeredAt ?? Date.now(),
          });
          updated++;
        } else {
          userId = await ctx.db.insert("users", {
            ...profile,
            name: profile.fullName,
            email,
            // Verified, so a later Google sign-in with this email links to this user.
            emailVerificationTime: email ? Date.now() : undefined,
            role: row.role ?? "voter",
            registeredAt: Date.now(),
          });
          created++;
        }

        if (!voter) {
          const voterId = await ctx.db.insert("eligibleVoters", {
            matricKey,
            fullName: profile.fullName,
            departmentId: profile.departmentId,
            level: profile.level,
          });
          voter = (await ctx.db.get(voterId))!;
        }
        await ctx.db.patch(voter._id, {
          fullName: profile.fullName,
          departmentId: profile.departmentId,
          level: profile.level,
          claimedByUserId: userId,
          claimedEmail: email ?? voter.claimedEmail,
        });
      } catch (err) {
        const reason =
          err instanceof ConvexError ? String(err.data) : err instanceof Error ? err.message : String(err);
        failed.push({ matricNumber, reason });
      }
    }
    return { created, updated, failed };
  },
});

/**
 * For `scripts/import-class-list.mjs`: create registered voters in `users`
 * only (no eligible-voter rows). Their email is where their sign-in code is
 * sent (see lib/voterOtp.ts).
 *
 * Idempotent: a matric number that already has a user updates that user's
 * profile, email and phone; their role is kept.
 */
export const importClassList = mutation({
  args: {
    secret: v.string(),
    rows: v.array(
      v.object({
        fullName: v.string(),
        matricNumber: v.string(),
        departmentId: v.string(),
        level: v.string(),
        email: v.string(),
        phone: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    assertOps(args.secret);
    let created = 0;
    let updated = 0;
    const failed: { matricNumber: string; reason: string }[] = [];

    for (const row of args.rows) {
      const matricNumber = row.matricNumber.trim().toUpperCase();
      try {
        if (!MATRIC_REGEX.test(matricNumber)) throw new Error("Invalid matric number format.");
        const email = row.email.trim().toLowerCase();
        if (!email.includes("@")) throw new Error("Invalid email.");
        const profile = {
          name: validate.text(row.fullName, "Full name"),
          fullName: validate.text(row.fullName, "Full name"),
          matricNumber,
          departmentId: validate.departmentId(row.departmentId),
          level: validate.level(row.level),
          email,
          emailVerificationTime: Date.now(),
          ...(row.phone?.trim() && { phone: row.phone.trim() }),
        };

        const [existing, ...others] = await findUsersByMatric(ctx, matricNumber);
        if (others.length) throw new Error("More than one user has this matric number.");
        const emailOwner = await ctx.db
          .query("users")
          .withIndex("email", (q) => q.eq("email", email))
          .first();
        if (emailOwner && emailOwner._id !== existing?._id) {
          throw new Error(`Email already belongs to ${emailOwner.matricNumber ?? "another user"}.`);
        }

        if (existing) {
          await ctx.db.patch(existing._id, {
            ...profile,
            role: existing.role ?? "voter",
            registeredAt: existing.registeredAt ?? Date.now(),
          });
          updated++;
        } else {
          await ctx.db.insert("users", { ...profile, role: "voter", registeredAt: Date.now() });
          created++;
        }
      } catch (err) {
        const reason =
          err instanceof ConvexError ? String(err.data) : err instanceof Error ? err.message : String(err);
        failed.push({ matricNumber, reason });
      }
    }
    return { created, updated, failed };
  },
});

/**
 * For `scripts/sync-eligible-voters.mjs`: give every registered user in a
 * department an eligible-voter row claimed by them, so turnout and the
 * eligible-voter counts include them. One page of users per call; run until
 * `isDone`.
 *
 * Idempotent: an unclaimed row is linked instead of duplicated, and a row
 * claimed by another user is left alone and reported.
 */
export const syncEligibleVotersFromUsers = mutation({
  args: {
    secret: v.string(),
    departmentId: v.string(),
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    assertOps(args.secret);
    const departmentId = validate.departmentId(args.departmentId);
    const page = await ctx.db
      .query("users")
      .withIndex("by_department", (q) => q.eq("departmentId", departmentId))
      .paginate({ numItems: 200, cursor: args.cursor });

    let created = 0;
    let linked = 0;
    let alreadyEligible = 0;
    let notRegistered = 0;
    const conflicts: { matricNumber: string; reason: string }[] = [];

    for (const user of page.page) {
      if (!isRegistered(user)) {
        notRegistered++;
        continue;
      }
      const matricKey = matricToDocId(user.matricNumber);
      const voter = await ctx.db
        .query("eligibleVoters")
        .withIndex("by_matric_key", (q) => q.eq("matricKey", matricKey))
        .unique();

      if (!voter) {
        await ctx.db.insert("eligibleVoters", {
          matricKey,
          fullName: user.fullName,
          departmentId: user.departmentId,
          level: user.level,
          claimedByUserId: user._id,
          claimedEmail: user.email,
        });
        created++;
      } else if (!voter.claimedByUserId) {
        await ctx.db.patch(voter._id, { claimedByUserId: user._id, claimedEmail: user.email });
        linked++;
      } else if (voter.claimedByUserId === user._id) {
        alreadyEligible++;
      } else {
        conflicts.push({
          matricNumber: user.matricNumber,
          reason: `Eligible-voter row is already claimed by ${voter.claimedEmail ?? voter.claimedByUserId}.`,
        });
      }
    }

    return {
      created,
      linked,
      alreadyEligible,
      notRegistered,
      conflicts,
      continueCursor: page.continueCursor,
      isDone: page.isDone,
    };
  },
});

export const seedEligibleVoters = mutation({
  args: {
    secret: v.string(),
    rows: v.array(
      v.object({
        matric: v.string(),
        fullName: v.string(),
        departmentId: v.string(),
        level: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    assertOps(args.secret);
    let written = 0;
    const existing: string[] = [];

    for (const row of args.rows) {
      const matricKey = matricToDocId(row.matric);
      const found = await ctx.db
        .query("eligibleVoters")
        .withIndex("by_matric_key", (q) => q.eq("matricKey", matricKey))
        .unique();
      if (found) {
        existing.push(matricKey);
        continue;
      }
      await ctx.db.insert("eligibleVoters", {
        matricKey,
        fullName: row.fullName,
        departmentId: row.departmentId,
        level: row.level,
      });
      written++;
    }
    return { written, existing };
  },
});

/** Idempotent: positions match by title (case-insensitive), candidates by name + position. */
export const seedCandidates = mutation({
  args: {
    secret: v.string(),
    electionId: v.id("elections"),
    rows: v.array(
      v.object({
        position: v.string(),
        order: v.number(),
        candidateName: v.string(),
        departmentId: v.string(),
        level: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    assertOps(args.secret);
    const election = await ctx.db.get(args.electionId);
    if (!election) throw new Error("Election not found.");

    const positions = await ctx.db
      .query("positions")
      .withIndex("by_election_order", (q) => q.eq("electionId", args.electionId))
      .collect();
    const positionByTitle = new Map(positions.map((p) => [p.title.toLowerCase(), p._id]));
    const candidates = await ctx.db
      .query("candidates")
      .withIndex("by_election", (q) => q.eq("electionId", args.electionId))
      .collect();
    const seen = new Set(candidates.map((c) => `${c.positionId}|${c.fullName.toLowerCase()}`));

    let positionsCreated = 0;
    let candidatesCreated = 0;
    let candidatesSkipped = 0;

    for (const row of args.rows) {
      let positionId = positionByTitle.get(row.position.toLowerCase());
      if (!positionId) {
        positionId = await ctx.db.insert("positions", {
          electionId: args.electionId,
          title: row.position,
          description: "",
          order: row.order,
          allowedLevels: [],
        });
        positionByTitle.set(row.position.toLowerCase(), positionId);
        positionsCreated++;
      }

      const key = `${positionId}|${row.candidateName.toLowerCase()}`;
      if (seen.has(key)) {
        candidatesSkipped++;
        continue;
      }
      seen.add(key);
      await ctx.db.insert("candidates", {
        electionId: args.electionId,
        positionId,
        fullName: row.candidateName,
        manifesto: "",
        departmentId: row.departmentId,
        level: row.level,
      });
      candidatesCreated++;
    }

    const total = candidates.length + candidatesCreated;
    await ctx.db.patch(args.electionId, { candidateCount: total });
    return { positionsCreated, candidatesCreated, candidatesSkipped, title: election.title };
  },
});

// --- Audit -------------------------------------------------------------------------

/** One page of an election's votes joined with voter, position and candidate names. */
export const auditPage = query({
  args: {
    secret: v.string(),
    electionId: v.id("elections"),
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    assertOps(args.secret);
    const [positions, candidates] = await Promise.all([
      ctx.db.query("positions").withIndex("by_election_order", (q) => q.eq("electionId", args.electionId)).collect(),
      ctx.db.query("candidates").withIndex("by_election", (q) => q.eq("electionId", args.electionId)).collect(),
    ]);
    const positionTitle = new Map(positions.map((p) => [p._id as string, p.title]));
    const candidateName = new Map(candidates.map((c) => [c._id as string, c.fullName]));

    const page = await ctx.db
      .query("votes")
      .withIndex("by_election", (q) => q.eq("electionId", args.electionId))
      .paginate({ numItems: 500, cursor: args.cursor });

    const voters = new Map<Id<"users">, { fullName: string; email: string; matric: string }>();
    const rows = [];
    for (const vote of page.page) {
      if (!voters.has(vote.voterId)) {
        const u = await ctx.db.get(vote.voterId);
        voters.set(vote.voterId, {
          fullName: u?.fullName ?? "UNKNOWN",
          email: u?.email ?? "UNKNOWN",
          matric: u?.matricNumber ?? "",
        });
      }
      const voter = voters.get(vote.voterId)!;
      rows.push({
        voterName: voter.fullName,
        voterEmail: voter.email,
        voterMatric: voter.matric,
        position: positionTitle.get(vote.positionId) ?? vote.positionId,
        candidate:
          vote.candidateId === "abstain"
            ? "ABSTAIN"
            : (candidateName.get(vote.candidateId) ?? vote.candidateId),
        votedAt: new Date(vote.votedAt).toISOString(),
      });
    }
    return { rows, continueCursor: page.continueCursor, isDone: page.isDone };
  },
});

// --- Stress test ---------------------------------------------------------------------

export const stressElection = query({
  args: { secret: v.string(), electionId: v.id("elections") },
  handler: async (ctx, args) => {
    assertOps(args.secret);
    const election = await ctx.db.get(args.electionId);
    if (!election) throw new Error("Election not found.");
    const [positions, candidates] = await Promise.all([
      ctx.db.query("positions").withIndex("by_election_order", (q) => q.eq("electionId", args.electionId)).collect(),
      ctx.db.query("candidates").withIndex("by_election", (q) => q.eq("electionId", args.electionId)).collect(),
    ]);
    return {
      departmentId: election.departmentId,
      status: election.status,
      positions: positions.map((p) => ({ id: p._id, allowedLevels: p.allowedLevels })),
      candidates: candidates.map((c) => ({ id: c._id, positionId: c.positionId })),
    };
  },
});

/** Synthetic voters (marked by their email domain) for load testing. */
export const stressCreateVoters = mutation({
  args: {
    secret: v.string(),
    runId: v.string(),
    count: v.number(),
    departmentId: v.string(),
    level: v.string(),
  },
  handler: async (ctx, args) => {
    assertOps(args.secret);
    const ids: Id<"users">[] = [];
    for (let i = 0; i < args.count; i++) {
      ids.push(
        await ctx.db.insert("users", {
          email: `stress-${args.runId}-${i}@stress.invalid`,
          fullName: `Stress Voter ${i}`,
          matricNumber: `00/${String(i).padStart(4, "0")}`,
          departmentId: args.departmentId,
          level: args.level,
          role: "voter",
          registeredAt: Date.now(),
        }),
      );
    }
    return ids;
  },
});

/** Cast a ballot through the same core as `votes.cast`, as a given (synthetic) voter. */
export const stressCast = mutation({
  args: {
    secret: v.string(),
    electionId: v.id("elections"),
    voterId: v.id("users"),
    selections: v.record(v.id("positions"), v.id("candidates")),
  },
  handler: async (ctx, args) => {
    assertOps(args.secret);
    const voter = await ctx.db.get(args.voterId);
    if (!isRegistered(voter)) throw new Error("Voter is not registered.");
    await castBallot(ctx, voter as RegisteredUser, args.electionId, args.selections);
  },
});

/** Remove synthetic voters and their votes. */
export const stressCleanup = mutation({
  args: { secret: v.string(), voterIds: v.array(v.id("users")) },
  handler: async (ctx, args) => {
    assertOps(args.secret);
    await removeSyntheticVoters(ctx, args.voterIds);
  },
});

const removeSyntheticVoters = async (ctx: MutationCtx, voterIds: Id<"users">[]) => {
  for (const voterId of voterIds) {
    const user = await ctx.db.get(voterId);
    if (!user?.email?.endsWith("@stress.invalid")) continue; // never touch real users

    const votes = await ctx.db
      .query("votes")
      .withIndex("by_voter_position", (q) => q.eq("voterId", voterId))
      .collect();
    for (const vote of votes) await ctx.db.delete(vote._id);
    await ctx.db.delete(voterId);
  }
};

// --- Analytics ---------------------------------------------------------------------

export const listElectionIds = internalQuery({
  args: {},
  handler: async (ctx) => (await ctx.db.query("elections").collect()).map((e) => e._id),
});

/** Regenerate the analytics summary of every election (run after a migration). */
export const generateAllAnalytics = action({
  args: { secret: v.string() },
  handler: async (ctx, args): Promise<{ elections: number; voteRecords: number }> => {
    assertOps(args.secret);
    const electionIds = await ctx.runQuery(internal.ops.listElectionIds, {});
    let voteRecords = 0;
    for (const electionId of electionIds) {
      const result = await ctx.runAction(internal.analytics.generate, { electionId });
      voteRecords += result.voteRecords;
    }
    return { elections: electionIds.length, voteRecords };
  },
});

/** Exact vote total, paged so the parity report isn't bounded by the 32k scan limit. */
export const countVotesPage = query({
  args: { secret: v.string(), cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, args) => {
    assertOps(args.secret);
    const page = await ctx.db
      .query("votes")
      .paginate({ numItems: 4000, cursor: args.cursor });
    return {
      count: page.page.length,
      continueCursor: page.continueCursor,
      isDone: page.isDone,
    };
  },
});
