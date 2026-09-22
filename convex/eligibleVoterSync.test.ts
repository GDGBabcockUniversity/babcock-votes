import { beforeEach, describe, expect, it } from "vitest";
import type { FunctionReturnType } from "convex/server";
import { api } from "./_generated/api";
import { addUnregisteredUser, addUser, newTest } from "./test.helpers";

type T = ReturnType<typeof newTest>;

const OPS = "test-ops-secret";

/** Run the sync to completion the way scripts/sync-eligible-voters.mjs does. */
const sync = async (t: T, departmentId = "medicine") => {
  const totals = {
    created: 0,
    linked: 0,
    alreadyEligible: 0,
    notRegistered: 0,
  };
  const conflicts: { matricNumber: string; reason: string }[] = [];
  let cursor: string | null = null;
  for (;;) {
    const result: FunctionReturnType<typeof api.ops.syncEligibleVotersFromUsers> = await t.mutation(
      api.ops.syncEligibleVotersFromUsers,
      {
        secret: OPS,
        departmentId,
        cursor,
      },
    );
    totals.created += result.created;
    totals.linked += result.linked;
    totals.alreadyEligible += result.alreadyEligible;
    totals.notRegistered += result.notRegistered;
    conflicts.push(...result.conflicts);
    if (result.isDone) return { ...totals, conflicts };
    cursor = result.continueCursor;
  }
};

const voterByKey = (t: T, matricKey: string) =>
  t.run((ctx) =>
    ctx.db
      .query("eligibleVoters")
      .withIndex("by_matric_key", (q) => q.eq("matricKey", matricKey))
      .unique(),
  );

const allVoters = (t: T) => t.run((ctx) => ctx.db.query("eligibleVoters").collect());

describe("ops.syncEligibleVotersFromUsers", () => {
  beforeEach(() => {
    process.env.OPS_SECRET = OPS;
  });

  it("gives each registered Medicine user a claimed eligible-voter row", async () => {
    const t = newTest();
    const ada = await addUser(t, {
      email: "ada@gmail.com",
      role: "voter",
      departmentId: "medicine",
      level: "600",
      fullName: "Ada Obi",
      matricNumber: "18/2428",
    });
    const tunde = await addUser(t, {
      email: "tunde@gmail.com",
      role: "voter",
      departmentId: "medicine",
      level: "500",
      fullName: "Tunde Bello",
      matricNumber: "19/1001",
    });

    const result = await sync(t);
    expect(result).toMatchObject({
      created: 2,
      linked: 0,
      alreadyEligible: 0,
      conflicts: [],
    });

    expect(await voterByKey(t, "18-2428")).toMatchObject({
      fullName: "Ada Obi",
      departmentId: "medicine",
      level: "600",
      claimedByUserId: ada,
      claimedEmail: "ada@gmail.com",
    });
    expect(await voterByKey(t, "19-1001")).toMatchObject({
      fullName: "Tunde Bello",
      level: "500",
      claimedByUserId: tunde,
    });
  });

  it("leaves other departments and unregistered users alone", async () => {
    const t = newTest();
    await addUser(t, {
      email: "cs@gmail.com",
      role: "voter",
      departmentId: "computer_science",
      matricNumber: "20/3000",
    });
    await addUnregisteredUser(t, "new@gmail.com");
    await t.run((ctx) =>
      ctx.db.insert("users", {
        email: "half@gmail.com",
        departmentId: "medicine",
        level: "600",
      }),
    );

    const result = await sync(t);
    expect(result).toMatchObject({ created: 0, notRegistered: 1 });
    expect(await allVoters(t)).toEqual([]);
  });

  it("links an existing unclaimed row instead of duplicating it", async () => {
    const t = newTest();
    const ada = await addUser(t, {
      email: "ada@gmail.com",
      role: "voter",
      departmentId: "medicine",
      level: "600",
      matricNumber: "18/2428",
    });
    await t.run((ctx) =>
      ctx.db.insert("eligibleVoters", {
        matricKey: "18-2428",
        fullName: "Ada Obi",
        departmentId: "medicine",
        level: "600",
      }),
    );

    expect(await sync(t)).toMatchObject({ created: 0, linked: 1 });
    const voters = await allVoters(t);
    expect(voters).toHaveLength(1);
    expect(voters[0]).toMatchObject({
      claimedByUserId: ada,
      claimedEmail: "ada@gmail.com",
    });
  });

  it("reports a row claimed by someone else and leaves it alone", async () => {
    const t = newTest();
    await addUser(t, {
      email: "ada@gmail.com",
      role: "voter",
      departmentId: "medicine",
      matricNumber: "18/2428",
    });
    const other = await addUser(t, {
      email: "other@gmail.com",
      role: "voter",
      departmentId: "computer_science",
      matricNumber: "21/0001",
    });
    await t.run((ctx) =>
      ctx.db.insert("eligibleVoters", {
        matricKey: "18-2428",
        fullName: "Someone Else",
        departmentId: "medicine",
        level: "600",
        claimedByUserId: other,
        claimedEmail: "other@gmail.com",
      }),
    );

    const result = await sync(t);
    expect(result.created).toBe(0);
    expect(result.conflicts).toEqual([
      {
        matricNumber: "18/2428",
        reason: expect.stringContaining("other@gmail.com"),
      },
    ]);
    expect(await voterByKey(t, "18-2428")).toMatchObject({
      fullName: "Someone Else",
      claimedByUserId: other,
    });
  });

  it("creates nothing when run again", async () => {
    const t = newTest();
    for (let i = 0; i < 3; i++) {
      await addUser(t, {
        email: `s${i}@gmail.com`,
        role: "voter",
        departmentId: "medicine",
        matricNumber: `18/100${i}`,
      });
    }

    expect(await sync(t)).toMatchObject({ created: 3 });
    expect(await sync(t)).toMatchObject({
      created: 0,
      linked: 0,
      alreadyEligible: 3,
    });
    expect(await allVoters(t)).toHaveLength(3);
  });

  it("pages through large departments", async () => {
    const t = newTest();
    await t.run(async (ctx) => {
      for (let i = 0; i < 250; i++) {
        await ctx.db.insert("users", {
          email: `s${i}@gmail.com`,
          fullName: `Student ${i}`,
          matricNumber: `18/${1000 + i}`,
          departmentId: "medicine",
          level: "600",
          role: "voter",
          registeredAt: Date.now(),
        });
      }
    });

    expect(await sync(t)).toMatchObject({ created: 250 });
    expect(await allVoters(t)).toHaveLength(250);
  });

  it("rejects an unknown department", async () => {
    const t = newTest();
    await expect(sync(t, "not_a_department")).rejects.toMatchObject({
      data: expect.stringContaining("Unknown department"),
    });
  });

  it("rejects a wrong secret", async () => {
    const t = newTest();
    await expect(
      t.mutation(api.ops.syncEligibleVotersFromUsers, {
        secret: "wrong",
        departmentId: "medicine",
        cursor: null,
      }),
    ).rejects.toThrow("Forbidden");
  });
});
