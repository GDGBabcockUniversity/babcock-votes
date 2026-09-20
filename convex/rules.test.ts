import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./_generated/api";
import { addElection, addUnregisteredUser, addUser, asUser, newTest } from "./test.helpers";

/** ConvexError messages arrive as `error.data`. */
const failsWith = (message: string) => ({ data: expect.stringContaining(message) });

const setup = async () => {
  const t = newTest();
  const admin = await addUser(t, { email: "admin@student.babcock.edu.ng", role: "super_admin" });
  const voter = await addUser(t, { email: "voter@student.babcock.edu.ng", role: "voter", level: "300" });
  const election = await addElection(t, admin);
  return { t, admin, voter, election };
};

describe("votes.cast", () => {
  it("records one vote per eligible position and tallies it", async () => {
    const { t, voter, election } = await setup();
    const asVoter = asUser(t, voter);

    await asVoter.mutation(api.votes.cast, {
      electionId: election.electionId,
      selections: { [election.president]: election.alice },
    });

    // Level 300 can't vote for the final-year-only position, so exactly one row.
    const votes = await t.run((ctx) => ctx.db.query("votes").collect());
    expect(votes).toHaveLength(1);
    expect(votes[0]).toMatchObject({ positionId: election.president, candidateId: election.alice });

    expect(await asVoter.query(api.votes.hasVoted, { electionId: election.electionId })).toBe(true);

    const admin = asUser(t, (await t.run((ctx) => ctx.db.query("users").first()))!._id);
    const tallies = await admin.query(api.votes.tallies, { electionId: election.electionId });
    expect(tallies.candidateVotes[election.alice]).toBe(1);
    expect(tallies.candidateVotes[election.bob]).toBe(0);
    expect(tallies.positionVotes[election.president]).toBe(1);
  });

  it("records an abstention for positions left unselected", async () => {
    const { t, voter, election } = await setup();

    await asUser(t, voter).mutation(api.votes.cast, {
      electionId: election.electionId,
      selections: {},
    });

    const [vote] = await t.run((ctx) => ctx.db.query("votes").collect());
    expect(vote.candidateId).toBe("abstain");
  });

  it("includes level-restricted positions for eligible levels", async () => {
    const { t, election } = await setup();
    const senior = await addUser(t, { email: "senior@student.babcock.edu.ng", role: "voter", level: "400" });

    await asUser(t, senior).mutation(api.votes.cast, {
      electionId: election.electionId,
      selections: { [election.finalYearRep]: election.carol },
    });

    expect(await t.run((ctx) => ctx.db.query("votes").collect())).toHaveLength(2);
  });

  it("rejects a second ballot from the same voter", async () => {
    const { t, voter, election } = await setup();
    const asVoter = asUser(t, voter);
    const ballot = { electionId: election.electionId, selections: {} };

    await asVoter.mutation(api.votes.cast, ballot);
    await expect(asVoter.mutation(api.votes.cast, ballot)).rejects.toMatchObject(
      failsWith("already voted"),
    );
    expect(await t.run((ctx) => ctx.db.query("votes").collect())).toHaveLength(1);
  });

  it("rejects votes in an election that isn't active", async () => {
    const { t, admin, voter } = await setup();
    const closed = await addElection(t, admin, { status: "closed" });

    await expect(
      asUser(t, voter).mutation(api.votes.cast, { electionId: closed.electionId, selections: {} }),
    ).rejects.toMatchObject(failsWith("no longer accepting votes"));
  });

  it("rejects voters from another department", async () => {
    const { t, election } = await setup();
    const outsider = await addUser(t, {
      email: "law@student.babcock.edu.ng",
      role: "voter",
      departmentId: "law",
    });

    await expect(
      asUser(t, outsider).mutation(api.votes.cast, { electionId: election.electionId, selections: {} }),
    ).rejects.toMatchObject(failsWith("not eligible"));
  });

  it("rejects a candidate that doesn't belong to the position", async () => {
    const { t, voter, election } = await setup();

    await expect(
      asUser(t, voter).mutation(api.votes.cast, {
        electionId: election.electionId,
        // Bob runs for President, not Final Year Rep.
        selections: { [election.president]: election.carol },
      }),
    ).rejects.toMatchObject(failsWith("invalid candidate"));
  });

  it("rejects a position the voter's level can't vote on", async () => {
    const { t, voter, election } = await setup();

    await expect(
      asUser(t, voter).mutation(api.votes.cast, {
        electionId: election.electionId,
        selections: { [election.finalYearRep]: election.carol },
      }),
    ).rejects.toMatchObject(failsWith("cannot vote for"));
  });

  it("rejects users who haven't registered, and signed-out callers", async () => {
    const { t, election } = await setup();
    const newcomer = await addUnregisteredUser(t, "new@student.babcock.edu.ng");
    const ballot = { electionId: election.electionId, selections: {} };

    await expect(asUser(t, newcomer).mutation(api.votes.cast, ballot)).rejects.toMatchObject(
      failsWith("complete registration"),
    );
    await expect(t.mutation(api.votes.cast, ballot)).rejects.toMatchObject(failsWith("signed in"));
  });
});

describe("votes.tallies", () => {
  it("derives tallies from the vote rows themselves", async () => {
    const { t, admin, voter, election } = await setup();

    // Written straight to the table, bypassing votes.cast entirely: there is no
    // cached total to update, so the tallies must still come out right.
    await t.run(async (ctx) => {
      for (const candidateId of [election.alice, election.alice, election.bob]) {
        ctx.db.insert("votes", {
          electionId: election.electionId,
          positionId: election.president,
          candidateId,
          voterId: voter,
          votedAt: Date.now(),
        });
      }
      await ctx.db.insert("votes", {
        electionId: election.electionId,
        positionId: election.president,
        candidateId: "abstain",
        voterId: voter,
        votedAt: Date.now(),
      });
    });

    const tallies = await asUser(t, admin).query(api.votes.tallies, {
      electionId: election.electionId,
    });

    expect(tallies.candidateVotes[election.alice]).toBe(2);
    expect(tallies.candidateVotes[election.bob]).toBe(1);
    expect(tallies.positionAbstains[election.president]).toBe(1);
    // Position total counts every ballot for it, abstentions included.
    expect(tallies.positionVotes[election.president]).toBe(4);
  });

  it("reports zero for candidates and positions with no votes", async () => {
    const { t, admin, election } = await setup();

    const tallies = await asUser(t, admin).query(api.votes.tallies, {
      electionId: election.electionId,
    });

    expect(tallies.candidateVotes[election.carol]).toBe(0);
    expect(tallies.positionVotes[election.finalYearRep]).toBe(0);
    expect(tallies.positionAbstains[election.finalYearRep]).toBe(0);
  });

  it("keeps remaining tallies correct after a candidate is deleted", async () => {
    const { t, admin, voter, election } = await setup();
    await asUser(t, voter).mutation(api.votes.cast, {
      electionId: election.electionId,
      selections: { [election.president]: election.alice },
    });

    await asUser(t, admin).mutation(api.candidates.remove, { id: election.bob });

    const tallies = await asUser(t, admin).query(api.votes.tallies, {
      electionId: election.electionId,
    });
    expect(tallies.candidateVotes[election.alice]).toBe(1);
    expect(tallies.candidateVotes[election.bob]).toBeUndefined();
  });

  it("is admin-only", async () => {
    const { t, voter, election } = await setup();

    await expect(
      asUser(t, voter).query(api.votes.tallies, { electionId: election.electionId }),
    ).rejects.toMatchObject(failsWith("Forbidden"));
  });
});

describe("registration", () => {
  const seedVoter = (t: Awaited<ReturnType<typeof setup>>["t"], matricKey = "21-0456") =>
    t.run((ctx) =>
      ctx.db.insert("eligibleVoters", {
        matricKey,
        fullName: "Ada Obi",
        departmentId: "computer_science",
        level: "200",
      }),
    );

  it("claims the voter record and fills in the profile", async () => {
    const { t } = await setup();
    const user = await addUnregisteredUser(t, "ada@student.babcock.edu.ng");
    const voterRow = await seedVoter(t);
    const asUnregistered = asUser(t, user);

    expect(await asUnregistered.query(api.registration.lookup, { matric: "21/0456" })).toEqual({
      fullName: "Ada Obi",
      departmentId: "computer_science",
      level: "200",
    });

    await asUnregistered.mutation(api.registration.register, { matric: "21/0456" });

    const me = await asUnregistered.query(api.users.me, {});
    expect(me?.profile).toMatchObject({ fullName: "Ada Obi", role: "voter", level: "200" });
    const claimed = await t.run((ctx) => ctx.db.get(voterRow));
    expect(claimed?.claimedByUserId).toBe(user);
  });

  it("refuses a matric someone else already claimed", async () => {
    const { t } = await setup();
    await seedVoter(t);
    const first = await addUnregisteredUser(t, "first@student.babcock.edu.ng");
    const second = await addUnregisteredUser(t, "second@student.babcock.edu.ng");

    await asUser(t, first).mutation(api.registration.register, { matric: "21/0456" });
    await expect(
      asUser(t, second).mutation(api.registration.register, { matric: "21/0456" }),
    ).rejects.toMatchObject(failsWith("already been registered"));
  });

  it("refuses unlisted matrics, bad formats and non-school emails", async () => {
    const { t } = await setup();
    await seedVoter(t);
    const school = asUser(t, await addUnregisteredUser(t, "x@student.babcock.edu.ng"));
    const outsider = asUser(t, await addUnregisteredUser(t, "x@gmail.com"));

    await expect(
      school.mutation(api.registration.register, { matric: "99/9999" }),
    ).rejects.toMatchObject(failsWith("not listed as an eligible voter"));
    await expect(
      school.mutation(api.registration.register, { matric: "nonsense" }),
    ).rejects.toMatchObject(failsWith("Matric number must be in format"));
    await expect(
      outsider.mutation(api.registration.register, { matric: "21/0456" }),
    ).rejects.toMatchObject(failsWith("Only @student.babcock.edu.ng"));
  });
});

describe("admin scoping", () => {
  it("lets a department admin edit their own department but not another's", async () => {
    const { t, admin } = await setup();
    const deptAdmin = await addUser(t, {
      email: "dept@student.babcock.edu.ng",
      role: "dept_admin",
      departmentId: "computer_science",
    });
    const own = await addElection(t, admin, { departmentId: "computer_science" });
    const other = await addElection(t, admin, { departmentId: "law" });
    const asDeptAdmin = asUser(t, deptAdmin);

    await asDeptAdmin.mutation(api.elections.update, { id: own.electionId, title: "Renamed" });
    await expect(
      asDeptAdmin.mutation(api.elections.update, { id: other.electionId, title: "Nope" }),
    ).rejects.toMatchObject(failsWith("Forbidden"));
    // Nor can they move their election into another department.
    await expect(
      asDeptAdmin.mutation(api.elections.update, { id: own.electionId, departmentId: "law" }),
    ).rejects.toMatchObject(failsWith("Forbidden"));
  });

  it("keeps voters out of admin functions and restricts role changes to super admins", async () => {
    const { t, admin, voter } = await setup();
    const deptAdmin = await addUser(t, { email: "dept@student.babcock.edu.ng", role: "dept_admin" });

    await expect(asUser(t, voter).query(api.users.list, {})).rejects.toMatchObject(failsWith("Forbidden"));
    await expect(
      asUser(t, deptAdmin).mutation(api.users.setRole, { userId: voter, role: "dept_admin" }),
    ).rejects.toMatchObject(failsWith("Forbidden"));

    await asUser(t, admin).mutation(api.users.setRole, { userId: voter, role: "dept_admin" });
    expect((await t.run((ctx) => ctx.db.get(voter)))?.role).toBe("dept_admin");
    await expect(
      asUser(t, admin).mutation(api.users.setRole, { userId: admin, role: "voter" }),
    ).rejects.toMatchObject(failsWith("own role"));
  });
});

describe("elections.remove", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("removes the election, its children and its votes", async () => {
    const { t, admin, voter, election } = await setup();
    await asUser(t, voter).mutation(api.votes.cast, { electionId: election.electionId, selections: {} });

    await asUser(t, admin).mutation(api.elections.remove, { id: election.electionId });
    // Votes are purged in chunks by a scheduled function.
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const left = await t.run(async (ctx) => ({
      elections: (await ctx.db.query("elections").collect()).length,
      positions: (await ctx.db.query("positions").collect()).length,
      candidates: (await ctx.db.query("candidates").collect()).length,
      votes: (await ctx.db.query("votes").collect()).length,
    }));
    expect(left).toEqual({ elections: 0, positions: 0, candidates: 0, votes: 0 });

    const stats = await asUser(t, admin).query(api.admin.dashboardStats, {});
    expect(stats.totalVotes).toBe(0);
  });
});
