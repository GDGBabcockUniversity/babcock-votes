import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const role = v.union(
  v.literal("voter"),
  v.literal("dept_admin"),
  v.literal("super_admin"),
);

export const electionStatus = v.union(
  v.literal("upcoming"),
  v.literal("active"),
  v.literal("closed"),
);

export default defineSchema({
  ...authTables,

  /**
   * Convex Auth's user document, extended with the voter profile. The profile
   * fields stay unset until registration completes: a user is "registered"
   * exactly when `role` is set.
   */
  users: defineTable({
    // Convex Auth fields
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // Profile
    fullName: v.optional(v.string()),
    matricNumber: v.optional(v.string()),
    /** `matricToDocId(matricNumber)`: how eligible voters are looked up. */
    matricKey: v.optional(v.string()),
    departmentId: v.optional(v.string()),
    level: v.optional(v.string()),
    role: v.optional(role),
    registeredAt: v.optional(v.number()),
    /** Firebase UID; only used while migrating. */
    legacyId: v.optional(v.string()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_department", ["departmentId"])
    .index("by_legacy_id", ["legacyId"]),

  eligibleVoters: defineTable({
    fullName: v.string(),
    departmentId: v.string(),
    level: v.string(),
    /** `matricToDocId(matric)`, e.g. "21-0456" or "pt-22-2222". */
    matricKey: v.string(),
    claimedByUserId: v.optional(v.id("users")),
    claimedEmail: v.optional(v.string()),
  })
    .index("by_matric_key", ["matricKey"])
    .index("by_department", ["departmentId"]),

  elections: defineTable({
    title: v.string(),
    description: v.string(),
    departmentId: v.string(),
    logoStorageId: v.optional(v.id("_storage")),
    /** Milliseconds since the epoch. */
    startDate: v.number(),
    endDate: v.number(),
    status: electionStatus,
    candidateCount: v.number(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    isDuplicate: v.optional(v.boolean()),
    duplicatedFromElectionId: v.optional(v.id("elections")),
    duplicatedAt: v.optional(v.number()),
    duplicatedBy: v.optional(v.id("users")),
    legacyId: v.optional(v.string()),
  })
    .index("by_start_date", ["startDate"])
    .index("by_created_at", ["createdAt"])
    .index("by_department", ["departmentId"])
    .index("by_legacy_id", ["legacyId"]),

  positions: defineTable({
    electionId: v.id("elections"),
    title: v.string(),
    description: v.string(),
    order: v.number(),
    /** Empty = open to every level. */
    allowedLevels: v.array(v.string()),
    legacyId: v.optional(v.string()),
  })
    .index("by_election_order", ["electionId", "order"])
    .index("by_legacy_id", ["legacyId"]),

  candidates: defineTable({
    electionId: v.id("elections"),
    positionId: v.id("positions"),
    fullName: v.string(),
    photoStorageId: v.optional(v.id("_storage")),
    manifesto: v.string(),
    departmentId: v.string(),
    level: v.string(),
    legacyId: v.optional(v.string()),
  })
    .index("by_election", ["electionId"])
    .index("by_position", ["positionId"])
    .index("by_legacy_id", ["legacyId"]),

  votes: defineTable({
    electionId: v.id("elections"),
    positionId: v.id("positions"),
    candidateId: v.union(v.id("candidates"), v.literal("abstain")),
    voterId: v.id("users"),
    votedAt: v.number(),
  })
    .index("by_voter_position", ["voterId", "positionId"])
    .index("by_candidate", ["candidateId"])
    .index("by_election_voter", ["electionId", "voterId"])
    .index("by_election_position", ["electionId", "positionId"])
    .index("by_election", ["electionId"]),

  electionAnalytics: defineTable({
    electionId: v.id("elections"),
    departmentId: v.string(),
    generatedAt: v.number(),
    /** See lib/election-analytics-types.ts; well under Convex's 1 MiB document limit. */
    summary: v.any(),
  }).index("by_election", ["electionId"]),
});
