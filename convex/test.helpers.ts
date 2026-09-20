/// <reference types="vite/client" />
// Test helpers only. The double dot in the filename makes Convex skip it when deploying.
import { convexTest } from "convex-test";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

// Every Convex module except test files, as convex-test expects.
const modules = import.meta.glob("./**/!(*.*.*)*.*s");

/** A fresh in-memory deployment loaded with the app's schema and functions. */
export const newTest = () => convexTest(schema, modules);

type Role = "voter" | "dept_admin" | "super_admin";

/** Seed a registered user and return their ID. */
export const addUser = (
  t: ReturnType<typeof newTest>,
  fields: {
    email: string;
    role: Role;
    departmentId?: string;
    level?: string;
    fullName?: string;
    matricNumber?: string;
  },
) =>
  t.run((ctx) =>
    ctx.db.insert("users", {
      email: fields.email,
      fullName: fields.fullName ?? fields.email.split("@")[0],
      matricNumber: fields.matricNumber ?? `00/${Math.floor(1000 + Math.random() * 8999)}`,
      departmentId: fields.departmentId ?? "computer_science",
      level: fields.level ?? "300",
      role: fields.role,
      registeredAt: Date.now(),
    }),
  );

/** Seed a signed-in-but-unregistered user (no profile yet). */
export const addUnregisteredUser = (t: ReturnType<typeof newTest>, email: string) =>
  t.run((ctx) => ctx.db.insert("users", { email, emailVerificationTime: Date.now() }));

/** Act as this user (Convex Auth identifies the user by the part of `subject` before `|`). */
export const asUser = (t: ReturnType<typeof newTest>, userId: Id<"users">) =>
  t.withIdentity({ subject: `${userId}|test-session` });

/**
 * An active election in computer_science with two president candidates and a
 * final-year-only position (level "400") with one candidate.
 */
export const addElection = async (
  t: ReturnType<typeof newTest>,
  createdBy: Id<"users">,
  overrides: { status?: "upcoming" | "active" | "closed"; departmentId?: string } = {},
) =>
  t.run(async (ctx) => {
    const now = Date.now();
    const electionId = await ctx.db.insert("elections", {
      title: "CS Association Election",
      description: "",
      departmentId: overrides.departmentId ?? "computer_science",
      status: overrides.status ?? "active",
      startDate: now - 1000,
      endDate: now + 86_400_000,
      candidateCount: 3,
      createdBy,
      createdAt: now,
    });
    const president = await ctx.db.insert("positions", {
      electionId,
      title: "President",
      description: "",
      order: 0,
      allowedLevels: [],
    });
    const finalYearRep = await ctx.db.insert("positions", {
      electionId,
      title: "Final Year Rep",
      description: "",
      order: 1,
      allowedLevels: ["400"],
    });
    const candidate = (positionId: Id<"positions">, fullName: string) =>
      ctx.db.insert("candidates", {
        electionId,
        positionId,
        fullName,
        manifesto: "",
        departmentId: "computer_science",
        level: "300",
      });

    return {
      electionId,
      president,
      finalYearRep,
      alice: await candidate(president, "Alice"),
      bob: await candidate(president, "Bob"),
      carol: await candidate(finalYearRep, "Carol"),
    };
  });
