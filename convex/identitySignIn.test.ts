import { describe, expect, it } from "vitest";
import { resolveIdentity } from "./lib/identitySignIn";
import { addUser, newTest } from "./test.helpers";

const failsWith = (message: string) => ({ data: expect.stringContaining(message) });

const addVoter = (t: ReturnType<typeof newTest>) =>
  t.run((ctx) =>
    ctx.db.insert("eligibleVoters", {
      matricKey: "21-0456",
      fullName: "Ada Obi",
      departmentId: "computer_science",
      level: "300",
    }),
  );

describe("matric/email + full name sign-in (resolveIdentity)", () => {
  it("registers a listed voter on their first matric sign-in", async () => {
    const t = newTest();
    const voterId = await addVoter(t);

    const userId = await t.run((ctx) =>
      resolveIdentity(ctx, { matric: "21/0456", fullName: "  obi   ADA " }),
    );

    const [user, voter] = await t.run((ctx) =>
      Promise.all([ctx.db.get(userId), ctx.db.get(voterId)]),
    );
    expect(user).toMatchObject({
      fullName: "Ada Obi",
      matricNumber: "21/0456",
      departmentId: "computer_science",
      level: "300",
      role: "voter",
    });
    expect(voter?.claimedByUserId).toBe(userId);
  });

  it("signs a returning voter into the user that claimed the matric", async () => {
    const t = newTest();
    await addVoter(t);

    const first = await t.run((ctx) => resolveIdentity(ctx, { matric: "21/0456", fullName: "Ada Obi" }));
    const second = await t.run((ctx) => resolveIdentity(ctx, { matric: "21/0456", fullName: "Ada Obi" }));

    expect(second).toBe(first);
    expect(await t.run(async (ctx) => (await ctx.db.query("users").collect()).length)).toBe(1);
  });

  it("refuses a matric with the wrong name, or one that isn't listed", async () => {
    const t = newTest();
    await addVoter(t);

    await expect(
      t.run((ctx) => resolveIdentity(ctx, { matric: "21/0456", fullName: "Someone Else" })),
    ).rejects.toMatchObject(failsWith("couldn't find a voter"));
    await expect(
      t.run((ctx) => resolveIdentity(ctx, { matric: "21/9999", fullName: "Ada Obi" })),
    ).rejects.toMatchObject(failsWith("couldn't find a voter"));
  });

  it("signs in a registered user by email and full name", async () => {
    const t = newTest();
    const id = await addUser(t, { email: "ada@student.babcock.edu.ng", fullName: "Ada Obi", role: "voter" });

    const result = await t.run((ctx) =>
      resolveIdentity(ctx, { email: "Ada@student.babcock.edu.ng", fullName: "ada obi" }),
    );
    expect(result).toBe(id);

    await expect(
      t.run((ctx) => resolveIdentity(ctx, { email: "ada@student.babcock.edu.ng", fullName: "Bola Obi" })),
    ).rejects.toMatchObject(failsWith("couldn't find a voter"));
  });
});
