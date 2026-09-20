import { describe, expect, it } from "vitest";
import { createOrUpdateUser } from "./lib/authCallbacks";
import { addUnregisteredUser, addUser, newTest } from "./test.helpers";

type Args = Parameters<typeof createOrUpdateUser>[1];

const google = (email: string): Args => ({
  existingUserId: null,
  type: "oauth",
  profile: { email, name: "Someone" },
});

/** What Convex Auth would call for a password account created with `createAccount` from ops.ts. */
const provisioned = (email: string): Args => ({
  existingUserId: null,
  type: "credentials",
  profile: { email, emailVerificationTime: Date.now() },
  shouldLinkViaEmail: true,
});

const failsWith = (message: string) => ({ data: expect.stringContaining(message) });
const userCount = (t: ReturnType<typeof newTest>) =>
  t.run(async (ctx) => (await ctx.db.query("users").collect()).length);

describe("sign-in gate (createOrUpdateUser)", () => {
  it("returns the linked user for a sign-in to an existing account", async () => {
    const t = newTest();
    const id = await addUser(t, { email: "a@student.babcock.edu.ng", role: "voter" });

    const result = await t.run((ctx) =>
      createOrUpdateUser(ctx, { ...google("a@student.babcock.edu.ng"), existingUserId: id }),
    );
    expect(result).toBe(id);
  });

  it("links a first Google sign-in to the migrated user with that verified email (no duplicate)", async () => {
    const t = newTest();
    // A migrated student: profile present, email verified (see migrateUsers).
    const migrated = await t.run((ctx) =>
      ctx.db.insert("users", {
        email: "ada@student.babcock.edu.ng",
        emailVerificationTime: Date.now(),
        fullName: "Ada Obi",
        matricNumber: "21/0456",
        departmentId: "computer_science",
        level: "300",
        role: "voter",
        legacyId: "fbAda",
      }),
    );

    const result = await t.run((ctx) => createOrUpdateUser(ctx, google("Ada@student.babcock.edu.ng")));

    expect(result).toBe(migrated);
    expect(await userCount(t)).toBe(1);
  });

  it("creates a verified user for a brand-new school Google account", async () => {
    const t = newTest();

    const id = await t.run((ctx) => createOrUpdateUser(ctx, google("new@student.babcock.edu.ng")));

    const user = await t.run((ctx) => ctx.db.get(id));
    expect(user).toMatchObject({ email: "new@student.babcock.edu.ng" });
    expect(user?.emailVerificationTime).toBeTypeOf("number");
    expect(user?.role).toBeUndefined(); // not registered yet
  });

  it("refuses Google accounts outside the school domain", async () => {
    const t = newTest();

    await expect(
      t.run((ctx) => createOrUpdateUser(ctx, google("someone@gmail.com"))),
    ).rejects.toMatchObject(failsWith("Only @student.babcock.edu.ng"));
    expect(await userCount(t)).toBe(0);
  });

  it("does not link to an existing user whose email was never verified", async () => {
    const t = newTest();
    // e.g. someone who started signing up but never proved the address
    await addUnregisteredUser(t, "x@student.babcock.edu.ng");
    await t.run((ctx) =>
      ctx.db.query("users").first().then((u) => ctx.db.patch(u!._id, { emailVerificationTime: undefined })),
    );

    await t.run((ctx) => createOrUpdateUser(ctx, google("x@student.babcock.edu.ng")));

    expect(await userCount(t)).toBe(2);
  });

  it("does not link when two verified users share the email (ambiguous)", async () => {
    const t = newTest();
    await addUnregisteredUser(t, "dup@student.babcock.edu.ng");
    await addUnregisteredUser(t, "dup@student.babcock.edu.ng");

    await t.run((ctx) => createOrUpdateUser(ctx, google("dup@student.babcock.edu.ng")));

    expect(await userCount(t)).toBe(3);
  });

  it("attaches a provisioned password account to the migrated part-time user (no duplicate)", async () => {
    const t = newTest();
    const migrated = await t.run((ctx) =>
      ctx.db.insert("users", {
        email: "pt-22-2222@parttime.babcockvotes.com",
        emailVerificationTime: Date.now(),
        fullName: "Pat Time",
        matricNumber: "PT/22/2222",
        departmentId: "computer_science",
        level: "Part-Time",
        role: "voter",
      }),
    );

    const result = await t.run((ctx) => createOrUpdateUser(ctx, provisioned("pt-22-2222@parttime.babcockvotes.com")));

    expect(result).toBe(migrated);
    expect(await userCount(t)).toBe(1);
  });

  it("creates a new part-time user when provisioning one from scratch", async () => {
    const t = newTest();

    const id = await t.run((ctx) => createOrUpdateUser(ctx, provisioned("pt-23-0001@parttime.babcockvotes.com")));

    expect((await t.run((ctx) => ctx.db.get(id)))?.email).toBe("pt-23-0001@parttime.babcockvotes.com");
    expect(await userCount(t)).toBe(1);
  });

  it("blocks password self-sign-up (no shouldLink), even for the part-time domain", async () => {
    const t = newTest();

    await expect(
      t.run((ctx) =>
        createOrUpdateUser(ctx, {
          existingUserId: null,
          type: "credentials",
          profile: { email: "pt-99-9999@parttime.babcockvotes.com" },
        }),
      ),
    ).rejects.toMatchObject(failsWith("Invalid email or password"));
    expect(await userCount(t)).toBe(0);
  });

  it("blocks password accounts for school emails and unsupported sign-in types", async () => {
    const t = newTest();

    await expect(
      t.run((ctx) => createOrUpdateUser(ctx, provisioned("student@student.babcock.edu.ng"))),
    ).rejects.toMatchObject(failsWith("Invalid email or password"));
    await expect(
      t.run((ctx) => createOrUpdateUser(ctx, { ...google("student@student.babcock.edu.ng"), type: "email" })),
    ).rejects.toMatchObject(failsWith("Invalid email or password"));
  });
});
