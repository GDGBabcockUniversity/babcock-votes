import { exportPKCS8, generateKeyPair } from "jose";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { createOrUpdateUser } from "./lib/authCallbacks";
import { generateVoterOtp, maskEmail, VOTER_OTP_PROVIDER } from "./lib/voterOtp";
import { LOGO_URL, parseSender, voterOtpMessage } from "./lib/voterOtpEmail";
import { addUser, newTest } from "./test.helpers";

type T = ReturnType<typeof newTest>;
type Args = Parameters<typeof createOrUpdateUser>[1];

const OPS = "test-ops-secret";
const failsWith = (message: string) => ({ data: expect.stringContaining(message) });

/** A class-list student, imported the way scripts/import-class-list.mjs does it. */
const importStudent = async (t: T, fields: { matricNumber?: string; email?: string } = {}) => {
  process.env.OPS_SECRET = OPS;
  const matricNumber = fields.matricNumber ?? "18/2428";
  const result = await t.mutation(api.ops.importClassList, {
    secret: OPS,
    rows: [
      {
        fullName: "Popoola Olamide Bridget",
        matricNumber,
        departmentId: "medicine",
        level: "600",
        email: fields.email ?? "olamide@gmail.com",
        phone: "09060057651",
      },
    ],
  });
  expect(result.failed).toEqual([]);
  const user = await t.run((ctx) =>
    ctx.db
      .query("users")
      .withIndex("by_matric_number", (q) => q.eq("matricNumber", matricNumber))
      .unique(),
  );
  return user!._id;
};

const userCount = (t: T) => t.run(async (ctx) => (await ctx.db.query("users").collect()).length);

/** What Convex Auth passes when a code is requested and when it is accepted. */
const request = (matricKey: string, existingUserId: Id<"users"> | null = null): Args => ({
  existingUserId,
  type: "email",
  provider: { id: VOTER_OTP_PROVIDER },
  profile: { email: matricKey },
});
const verify = (matricKey: string, existingUserId: Id<"users">): Args => ({
  existingUserId,
  type: "verification",
  provider: { id: VOTER_OTP_PROVIDER },
  profile: { email: matricKey, emailVerified: true },
});

describe("voterOtp.lookup", () => {
  it("masks the email", async () => {
    const t = newTest();
    await importStudent(t);
    expect(await t.query(api.voterOtp.lookup, { matric: "18/2428", fullName: "Popoola Olamide Bridget" })).toEqual({
      maskedEmail: "o****e@gmail.com",
    });
    expect(maskEmail("ab@x.com")).toBe("a****@x.com");
  });

  it("fails for an unknown matric, one only on the eligible-voter list, and a user without an email", async () => {
    const t = newTest();
    await addUser(t, { email: "x@y.com", role: "voter", matricNumber: "18/0001" });
    await t.run(async (ctx) => {
      const user = await ctx.db
        .query("users")
        .withIndex("by_matric_number", (q) => q.eq("matricNumber", "18/0001"))
        .unique();
      await ctx.db.patch(user!._id, { email: undefined });
      await ctx.db.insert("eligibleVoters", {
        fullName: "Ada Obi",
        departmentId: "medicine",
        level: "600",
        matricKey: "18-0002",
      });
    });

    for (const matric of ["18/9999", "18/0002", "nonsense"]) {
      await expect(t.query(api.voterOtp.lookup, { matric, fullName: "Ada Obi" })).rejects.toMatchObject(
        failsWith("not listed"),
      );
    }
    await expect(t.query(api.voterOtp.lookup, { matric: "18/0001", fullName: "Ada Obi" })).rejects.toMatchObject(
      failsWith("don't have an email"),
    );
  });
});

describe("sign-in gate: voter-otp", () => {
  it("signs into the imported user without creating anyone", async () => {
    const t = newTest();
    const userId = await importStudent(t);
    const before = await userCount(t);

    const requested = await t.run((ctx) => createOrUpdateUser(ctx, request("18-2428")));
    const signedIn = await t.run((ctx) => createOrUpdateUser(ctx, verify("18-2428", requested)));

    expect(requested).toBe(userId);
    expect(signedIn).toBe(userId);
    expect(await userCount(t)).toBe(before);
  });

  it("refuses a matric held by more than one user rather than guess", async () => {
    const t = newTest();
    await importStudent(t);
    await addUser(t, { email: "twin@student.babcock.edu.ng", role: "voter", matricNumber: "18/2428" });

    await expect(
      t.run((ctx) => createOrUpdateUser(ctx, request("18-2428"))),
    ).rejects.toMatchObject(failsWith("not listed"));
  });

  it("rejects an unknown or non-canonical matric and creates nobody", async () => {
    const t = newTest();
    await importStudent(t);
    const before = await userCount(t);

    for (const key of ["18-9999", "18/2428", "garbage"]) {
      await expect(
        t.run((ctx) => createOrUpdateUser(ctx, request(key))),
      ).rejects.toMatchObject(failsWith("not listed"));
    }
    expect(await userCount(t)).toBe(before);
  });
});

describe("the whole flow through Convex Auth", () => {
  const sent: { to: string; text: string }[] = [];
  const params = { email: "18-2428" };

  const requestCode = (t: T) => t.action(api.auth.signIn, { provider: VOTER_OTP_PROVIDER, params });
  const signInWith = (t: T, code: string, email = params.email) =>
    t.action(api.auth.signIn, { provider: VOTER_OTP_PROVIDER, params: { email, code } });
  const codeIn = (text: string) => text.match(/\b(\d{6})\b/)![1];
  /** Pretend the pending code was sent `ms` ago. */
  const age = (t: T, ms: number) =>
    t.run(async (ctx) => {
      const code = await ctx.db.query("authVerificationCodes").unique();
      await ctx.db.patch(code!._id, { expirationTime: code!.expirationTime - ms });
    });

  beforeAll(async () => {
    // Signing in issues a JWT.
    const { privateKey } = await generateKeyPair("RS256", { extractable: true });
    process.env.JWT_PRIVATE_KEY = await exportPKCS8(privateKey);
    process.env.CONVEX_SITE_URL = "https://test.convex.site";
    process.env.SITE_URL = "https://votes.example.com";
  });

  afterAll(() => {
    delete process.env.JWT_PRIVATE_KEY;
    delete process.env.CONVEX_SITE_URL;
    delete process.env.SITE_URL;
    delete process.env.OPS_SECRET;
  });

  beforeEach(() => {
    sent.length = 0;
    process.env.BREVO_API_KEY = "test-key";
    process.env.EMAIL_FROM = "Babcock Votes <votes@example.com>";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        const body = JSON.parse(String(init.body));
        sent.push({ to: body.to[0].email, text: body.textContent });
        return new Response("{}", { status: 201 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.BREVO_API_KEY;
    delete process.env.EMAIL_FROM;
  });

  it("emails a 6-digit code that signs the student in once", async () => {
    const t = newTest();
    const userId = await importStudent(t);

    await requestCode(t);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("olamide@gmail.com");
    const code = codeIn(sent[0].text);

    expect((await signInWith(t, code)).tokens).toBeTruthy();
    const session = await t.run((ctx) => ctx.db.query("authSessions").unique());
    expect(session?.userId).toBe(userId);

    // Used up.
    await expect(signInWith(t, code)).rejects.toThrow("Could not verify code");
  });

  it("rejects a wrong code, and a right code sent with another matric", async () => {
    const t = newTest();
    await importStudent(t);
    await importStudent(t, { matricNumber: "18/0424", email: "etok@yahoo.com" });

    await requestCode(t);
    const code = codeIn(sent[0].text);
    const wrong = code === "000000" ? "000001" : "000000";

    await expect(signInWith(t, wrong)).rejects.toThrow("Could not verify code");
    await expect(signInWith(t, code, "18-0424")).rejects.toThrow("Could not verify code");
    // Still good for its own matric.
    expect((await signInWith(t, code)).tokens).toBeTruthy();
  });

  it("expires after 1 hour", async () => {
    const t = newTest();
    await importStudent(t);
    await requestCode(t);
    await age(t, 60 * 60 * 1000 + 1000);

    await expect(signInWith(t, codeIn(sent[0].text))).rejects.toThrow("Could not verify code");
  });

  it("allows one code a minute, and a new code cancels the old one", async () => {
    const t = newTest();
    await importStudent(t);
    const storedCode = () =>
      t.run(async (ctx) => (await ctx.db.query("authVerificationCodes").unique())?._id);

    await requestCode(t);
    const pending = await storedCode();
    await expect(requestCode(t)).rejects.toMatchObject(failsWith("Please wait"));
    expect(sent).toHaveLength(1);
    // The refused request left the emailed code in place.
    expect(await storedCode()).toBe(pending);

    await age(t, 61_000);
    await requestCode(t);
    expect(sent).toHaveLength(2);

    const [oldCode, newCode] = sent.map((s) => codeIn(s.text));
    if (oldCode !== newCode) {
      await expect(signInWith(t, oldCode)).rejects.toThrow("Could not verify code");
    }
    expect((await signInWith(t, newCode)).tokens).toBeTruthy();
  });
});

describe("ops.importClassList", () => {
  it("writes users only, and a re-import updates instead of duplicating", async () => {
    const t = newTest();
    const first = await importStudent(t);
    const again = await importStudent(t, { email: "new.address@gmail.com" });

    expect(again).toBe(first);
    expect(await userCount(t)).toBe(1);
    expect(await t.run((ctx) => ctx.db.get(first))).toMatchObject({
      fullName: "Popoola Olamide Bridget",
      matricNumber: "18/2428",
      departmentId: "medicine",
      level: "600",
      role: "voter",
      email: "new.address@gmail.com",
      phone: "09060057651",
    });
    expect(await t.run((ctx) => ctx.db.query("eligibleVoters").collect())).toEqual([]);
  });

  it("refuses an email that belongs to another user", async () => {
    const t = newTest();
    await importStudent(t);
    const result = await t.mutation(api.ops.importClassList, {
      secret: OPS,
      rows: [
        {
          fullName: "Someone Else",
          matricNumber: "18/0424",
          departmentId: "medicine",
          level: "600",
          email: "olamide@gmail.com",
        },
      ],
    });
    expect(result).toMatchObject({ created: 0, failed: [{ matricNumber: "18/0424" }] });
  });
});

describe("codes and email", () => {
  it("generates 6-digit codes", () => {
    for (let i = 0; i < 200; i++) expect(generateVoterOtp()).toMatch(/^\d{6}$/);
  });

  it("parses the sender", () => {
    expect(parseSender("Babcock Votes <votes@example.com>")).toEqual({
      name: "Babcock Votes",
      email: "votes@example.com",
    });
    expect(parseSender("votes@example.com")).toEqual({ email: "votes@example.com" });
    expect(parseSender(" ")).toBeNull();
  });

  it("puts the code in the email and escapes the name", () => {
    const { html, text, subject } = voterOtpMessage({ fullName: "<b>Ada</b>", code: "042917" });
    expect(subject).toContain("042917");
    expect(text).toContain("042917");
    expect(text).toContain("1 hour");
    expect(html).toContain("&lt;b&gt;Ada&lt;/b&gt;");
  });

  it("shows the GDG Babcock logo", () => {
    const { html } = voterOtpMessage({ fullName: "Ada", code: "042917" });
    expect(html).toContain(`<img src="${LOGO_URL}"`);
  });

  it("signs off from the GDG Babcock Team", () => {
    const { html, text } = voterOtpMessage({ fullName: "Ada", code: "042917" });
    expect(text).toMatch(/Warm regards,\nThe GDG Babcock Team$/);
    expect(html).toContain("Warm regards,<br />The GDG Babcock Team");
  });
});
