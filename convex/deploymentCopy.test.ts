import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { addUnregisteredUser, addUser, newTest } from "./test.helpers";

type T = ReturnType<typeof newTest>;

const OPS = "test-ops-secret";

/** Copy users, then eligible voters, the way scripts/migrate-dev-to-prod.mjs does. */
const copy = async (from: T, to: T) => {
  const users = await from.query(api.ops.exportUsersPage, { secret: OPS, cursor: null });
  const voters = await from.query(api.ops.exportEligibleVotersPage, { secret: OPS, cursor: null });
  return {
    exported: users,
    users: await to.mutation(api.ops.upsertUsers, { secret: OPS, rows: users.rows }),
    voters: await to.mutation(api.ops.upsertEligibleVoters, { secret: OPS, rows: voters.rows }),
  };
};

const byMatric = (t: T, matricNumber: string) =>
  t.run((ctx) =>
    ctx.db
      .query("users")
      .withIndex("by_matric_number", (q) => q.eq("matricNumber", matricNumber))
      .unique(),
  );

const voterByKey = (t: T, matricKey: string) =>
  t.run((ctx) =>
    ctx.db
      .query("eligibleVoters")
      .withIndex("by_matric_key", (q) => q.eq("matricKey", matricKey))
      .unique(),
  );

describe("copying users and eligible voters between deployments", () => {
  beforeEach(() => {
    process.env.OPS_SECRET = OPS;
  });

  it("recreates registered users and re-points claims at the target's users", async () => {
    const dev = newTest();
    const prod = newTest();
    const ada = await addUser(dev, {
      email: "ada@gmail.com",
      role: "voter",
      departmentId: "medicine",
      level: "600",
      fullName: "Ada Obi",
      matricNumber: "18/2428",
    });
    await addUser(dev, { email: "admin@gmail.com", role: "dept_admin", matricNumber: "19/0001" });
    await addUnregisteredUser(dev, "drifter@gmail.com");
    await dev.run((ctx) =>
      ctx.db.insert("eligibleVoters", {
        matricKey: "18-2428",
        fullName: "Ada Obi",
        departmentId: "medicine",
        level: "600",
        claimedByUserId: ada,
        claimedEmail: "ada@gmail.com",
      }),
    );

    const result = await copy(dev, prod);
    expect(result.exported.skipped).toBe(1);
    expect(result.users).toEqual({ created: 2, updated: 0, failed: [] });
    expect(result.voters).toEqual({ created: 1, updated: 0, unresolvedClaims: [] });

    const prodAda = await byMatric(prod, "18/2428");
    expect(prodAda).toMatchObject({
      email: "ada@gmail.com",
      fullName: "Ada Obi",
      departmentId: "medicine",
      level: "600",
      role: "voter",
    });
    expect((await byMatric(prod, "19/0001"))?.role).toBe("dept_admin");
    expect(await voterByKey(prod, "18-2428")).toMatchObject({
      claimedByUserId: prodAda!._id,
      claimedEmail: "ada@gmail.com",
    });
  });

  it("updates existing users instead of duplicating them, and is safe to re-run", async () => {
    const dev = newTest();
    const prod = newTest();
    await addUser(dev, {
      email: "ada@gmail.com",
      role: "voter",
      level: "600",
      matricNumber: "18/2428",
    });
    const existing = await addUser(prod, {
      email: "ada@gmail.com",
      role: "voter",
      level: "500",
      matricNumber: "18/2428",
    });

    expect((await copy(dev, prod)).users).toEqual({ created: 0, updated: 1, failed: [] });
    expect((await copy(dev, prod)).users).toEqual({ created: 0, updated: 1, failed: [] });
    const users = await prod.run((ctx) => ctx.db.query("users").collect());
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({ _id: existing, level: "600" });
  });

  it("refuses an email that belongs to a different matric on the target", async () => {
    const dev = newTest();
    const prod = newTest();
    await addUser(dev, { email: "ada@gmail.com", role: "voter", matricNumber: "18/2428" });
    await addUser(prod, { email: "ada@gmail.com", role: "voter", matricNumber: "20/0001" });

    const { users } = await copy(dev, prod);
    expect(users.created).toBe(0);
    expect(users.failed).toEqual([
      { matricNumber: "18/2428", reason: expect.stringContaining("20/0001") },
    ]);
  });

  it("rejects a wrong secret", async () => {
    const t = newTest();
    await expect(
      t.query(api.ops.exportUsersPage, { secret: "wrong", cursor: null }),
    ).rejects.toThrow("Forbidden");
    await expect(t.mutation(api.ops.upsertUsers, { secret: "wrong", rows: [] })).rejects.toThrow(
      "Forbidden",
    );
  });
});
