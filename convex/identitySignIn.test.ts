import { describe, expect, it } from "vitest";
import { resolveIdentity } from "./lib/identitySignIn";
import { addUser, addUnregisteredUser, newTest } from "./test.helpers";

const failsWith = (message: string) => ({ data: expect.stringContaining(message) });

describe("email + full name sign-in (resolveIdentity)", () => {
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

  it("refuses an email that has no registered profile, or that isn't known", async () => {
    const t = newTest();
    await addUnregisteredUser(t, "new@student.babcock.edu.ng");

    await expect(
      t.run((ctx) => resolveIdentity(ctx, { email: "new@student.babcock.edu.ng", fullName: "New Student" })),
    ).rejects.toMatchObject(failsWith("couldn't find a voter"));
    await expect(
      t.run((ctx) => resolveIdentity(ctx, { email: "nobody@student.babcock.edu.ng", fullName: "No Body" })),
    ).rejects.toMatchObject(failsWith("couldn't find a voter"));
  });

  it("asks for the email and the full name", async () => {
    const t = newTest();
    await expect(t.run((ctx) => resolveIdentity(ctx, { email: " ", fullName: "Ada Obi" }))).rejects.toMatchObject(
      failsWith("enter your email"),
    );
    await expect(
      t.run((ctx) => resolveIdentity(ctx, { email: "a@student.babcock.edu.ng", fullName: " " })),
    ).rejects.toMatchObject(failsWith("enter your full name"));
  });
});
