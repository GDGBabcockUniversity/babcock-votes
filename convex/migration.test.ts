import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { newTest } from "./test.helpers";

const secret = "test-secret";

beforeEach(() => {
  process.env.OPS_SECRET = secret;
});

// Firebase-shaped input, exactly what scripts/migrate-firebase-to-convex.mjs sends.
const users = [
  { legacyId: "fbAdmin", email: "Admin@student.babcock.edu.ng", name: "Admin", fullName: "Admin", matricNumber: "18/0001", departmentId: "computer_science", level: "400", role: "super_admin" as const, createdAt: 1_700_000_000_000 },
  { legacyId: "fbVoter1", email: "v1@student.babcock.edu.ng", name: "One", fullName: "Voter One", matricNumber: "21/0456", departmentId: "computer_science", level: "300", role: "voter" as const, createdAt: 1_700_000_100_000 },
  { legacyId: "fbVoter2", email: "v2@student.babcock.edu.ng", name: "Two", fullName: "Voter Two", matricNumber: "21/0457", departmentId: "computer_science", level: "300", role: "voter" as const, createdAt: 1_700_000_200_000 },
];
const election = {
  legacyId: "fbElection", title: "CS Election", description: "", departmentId: "computer_science", status: "closed" as const,
  startDate: 1_700_000_000_000, endDate: 1_700_100_000_000, candidateCount: 2, createdByLegacyId: "fbAdmin", createdAt: 1_700_000_000_000,
};
const demo = { ...election, legacyId: "fbDemo", title: "CS Election (Demo)", isDuplicate: true, duplicatedFromLegacyId: "fbElection", status: "active" as const };
const position = { legacyId: "fbPos", electionLegacyId: "fbElection", title: "President", description: "", order: 0, allowedLevels: [] };
const candidates = [
  { legacyId: "fbAlice", electionLegacyId: "fbElection", positionLegacyId: "fbPos", fullName: "Alice", manifesto: "", departmentId: "computer_science", level: "300" },
  { legacyId: "fbBob", electionLegacyId: "fbElection", positionLegacyId: "fbPos", fullName: "Bob", manifesto: "", departmentId: "computer_science", level: "300" },
];
const vote = (voter: string, candidate: string) => ({
  electionLegacyId: "fbElection", positionLegacyId: "fbPos", candidateLegacyId: candidate, voterLegacyId: voter, votedAt: 1_700_000_500_000,
});

const voteCount = (t: ReturnType<typeof newTest>) =>
  t.run(async (ctx) => (await ctx.db.query("votes").collect()).length);

const migrateAll = async (t: ReturnType<typeof newTest>, votes = [vote("fbVoter1", "fbAlice"), vote("fbVoter2", "abstain")]) => {
  await t.mutation(api.ops.migrateUsers, { secret, rows: users });
  await t.mutation(api.ops.migrateEligibleVoters, {
    secret,
    rows: [
      { matricKey: "21-0456", fullName: "Voter One", departmentId: "computer_science", level: "300", claimedByLegacyUid: "fbVoter1", claimedEmail: "v1@student.babcock.edu.ng" },
      { matricKey: "21-0999", fullName: "Not Registered", departmentId: "computer_science", level: "300" },
    ],
  });
  // The demo comes first, before the election it was copied from, to exercise the second pass.
  await t.mutation(api.ops.migrateElections, { secret, rows: [demo, election] });
  await t.mutation(api.ops.migratePositions, { secret, rows: [position] });
  await t.mutation(api.ops.migrateCandidates, { secret, rows: candidates });
  return t.mutation(api.ops.migrateVotes, { secret, rows: votes });
};

describe("Firebase migration mutations", () => {
  it("rejects calls without the ops secret", async () => {
    const t = newTest();
    await expect(t.mutation(api.ops.migrateUsers, { secret: "wrong", rows: [] })).rejects.toThrow("Forbidden");
    delete process.env.OPS_SECRET; // unset = everything off
    await expect(t.mutation(api.ops.migrateUsers, { secret, rows: [] })).rejects.toThrow("Forbidden");
  });

  it("remaps Firebase IDs to Convex references and rebuilds the tallies", async () => {
    const t = newTest();
    const result = await migrateAll(t);
    expect(result).toMatchObject({ inserted: 2, skipped: 0, unresolved: [] });

    const data = await t.run(async (ctx) => {
      const admin = (await ctx.db.query("users").withIndex("by_legacy_id", (q) => q.eq("legacyId", "fbAdmin")).unique())!;
      const voter1 = (await ctx.db.query("users").withIndex("by_legacy_id", (q) => q.eq("legacyId", "fbVoter1")).unique())!;
      const real = (await ctx.db.query("elections").withIndex("by_legacy_id", (q) => q.eq("legacyId", "fbElection")).unique())!;
      const copy = (await ctx.db.query("elections").withIndex("by_legacy_id", (q) => q.eq("legacyId", "fbDemo")).unique())!;
      const claimed = (await ctx.db.query("eligibleVoters").withIndex("by_matric_key", (q) => q.eq("matricKey", "21-0456")).unique())!;
      const alice = (await ctx.db.query("candidates").withIndex("by_legacy_id", (q) => q.eq("legacyId", "fbAlice")).unique())!;
      return { admin, voter1, real, copy, claimed, alice, votes: await ctx.db.query("votes").collect() };
    });

    expect(data.admin.email).toBe("admin@student.babcock.edu.ng"); // lowercased
    expect(data.admin.emailVerificationTime).toBeTypeOf("number"); // so Google sign-in links to it
    expect(data.admin.role).toBe("super_admin");
    expect(data.voter1.matricNumber).toBe("21/0456");
    expect(data.real.createdBy).toBe(data.admin._id);
    expect(data.copy.duplicatedFromElectionId).toBe(data.real._id);
    expect(data.claimed.claimedByUserId).toBe(data.voter1._id);
    expect(data.votes).toHaveLength(2);
    expect(data.votes.find((v) => v.voterId === data.voter1._id)?.candidateId).toBe(data.alice._id);

    const counts = await t.query(api.ops.verifyCounts, { secret });
    expect(counts).toEqual({ users: 3, eligibleVoters: 2, elections: 2, positions: 1, candidates: 2 });
    expect(await voteCount(t)).toBe(2);
    expect(await t.query(api.ops.tallyByLegacy, { secret, candidateLegacyIds: ["fbAlice", "fbBob"] })).toEqual({ fbAlice: 1, fbBob: 0 });
  });

  it("is idempotent: re-running changes nothing and never double counts votes", async () => {
    const t = newTest();
    await migrateAll(t);
    const second = await migrateAll(t);

    expect(second).toMatchObject({ inserted: 0, skipped: 2 });
    const counts = await t.query(api.ops.verifyCounts, { secret });
    expect(counts).toEqual({ users: 3, eligibleVoters: 2, elections: 2, positions: 1, candidates: 2 });
    expect(await voteCount(t)).toBe(2);
    expect(await t.query(api.ops.tallyByLegacy, { secret, candidateLegacyIds: ["fbAlice"] })).toEqual({ fbAlice: 1 });
  });

  it("skips (and reports) votes that reference something that wasn't migrated", async () => {
    const t = newTest();
    const result = await migrateAll(t, [
      vote("fbVoter1", "fbAlice"),
      vote("fbGhostVoter", "fbAlice"), // voter never registered
      vote("fbVoter2", "fbDeletedCandidate"), // candidate was deleted
    ]);

    expect(result.inserted).toBe(1);
    expect(result.unresolved).toHaveLength(2);
    expect(await voteCount(t)).toBe(1);
  });

  it("attributes elections to a super admin when the creator has no profile", async () => {
    const t = newTest();
    await t.mutation(api.ops.migrateUsers, { secret, rows: users });
    const result = await t.mutation(api.ops.migrateElections, {
      secret,
      rows: [{ ...election, createdByLegacyId: "fbNobody" }],
    });

    expect(result.notes[0]).toContain("attributed to a super admin");
    const created = await t.run((ctx) => ctx.db.query("elections").first());
    const admin = await t.run((ctx) => ctx.db.query("users").withIndex("by_legacy_id", (q) => q.eq("legacyId", "fbAdmin")).unique());
    expect(created?.createdBy).toBe(admin?._id);
  });
});

describe("ops.importUsers", () => {
  const ada = {
    fullName: "Ada Obi",
    matricNumber: "21/0456",
    departmentId: "computer_science",
    level: "300",
    email: "Ada@student.babcock.edu.ng",
  };

  it("creates a registered user that claims (or creates) their eligible-voter row", async () => {
    const t = newTest();
    const result = await t.mutation(api.ops.importUsers, { secret, rows: [ada] });
    expect(result).toEqual({ created: 1, updated: 0, failed: [] });

    const [users, voters] = await t.run(async (ctx) => [
      await ctx.db.query("users").collect(),
      await ctx.db.query("eligibleVoters").collect(),
    ] as const);
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({ email: "ada@student.babcock.edu.ng", role: "voter", matricNumber: "21/0456" });
    expect(voters).toHaveLength(1);
    expect(voters[0]).toMatchObject({ matricKey: "21-0456", claimedByUserId: users[0]._id });
  });

  it("updates on re-run instead of duplicating, and keeps the role unless one is given", async () => {
    const t = newTest();
    await t.mutation(api.ops.importUsers, { secret, rows: [{ ...ada, role: "viewer" }] });

    const again = await t.mutation(api.ops.importUsers, { secret, rows: [{ ...ada, level: "400" }] });
    expect(again).toEqual({ created: 0, updated: 1, failed: [] });

    const users = await t.run((ctx) => ctx.db.query("users").collect());
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({ level: "400", role: "viewer" });
  });

  it("reports bad rows without stopping the batch", async () => {
    const t = newTest();
    const result = await t.mutation(api.ops.importUsers, {
      secret,
      rows: [
        { ...ada, departmentId: "nope" },
        { ...ada, matricNumber: "bad" },
        { ...ada, matricNumber: "21/0457", email: undefined },
      ],
    });
    expect(result.created).toBe(1);
    expect(result.failed).toEqual([
      { matricNumber: "21/0456", reason: "Unknown department." },
      { matricNumber: "bad", reason: "Invalid matric number format." },
    ]);
  });
});
