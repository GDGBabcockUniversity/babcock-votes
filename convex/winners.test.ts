import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { buildSummary } from "./lib/analyticsSummary";
import { meetsMinimum, resolveWinners } from "../lib/winners";
import { addElection, addUser, asUser, newTest } from "./test.helpers";

const failsWith = (message: string) => ({ data: expect.stringContaining(message) });

const cand = (name: string, voteCount: number) => ({ name, voteCount });

describe("resolveWinners", () => {
  it("is plain plurality without a minimum", () => {
    const { winners, others, belowMinimum } = resolveWinners([cand("A", 3), cand("B", 2)], 10);
    expect(winners.map((c) => c.name)).toEqual(["A"]);
    expect(others.map((c) => c.name)).toEqual(["B"]);
    expect(belowMinimum).toBe(false);
  });

  it("gives everyone tied on top the win", () => {
    const { winners } = resolveWinners([cand("A", 4), cand("B", 4), cand("C", 1)], 10, 75);
    expect(winners.map((c) => c.name)).toEqual(["A", "B"]);
  });

  it("uses plurality for contested positions even below the minimum", () => {
    const { winners, others, belowMinimum } = resolveWinners([cand("A", 4), cand("B", 3)], 10, 75);
    expect(winners.map((c) => c.name)).toEqual(["A"]);
    expect(others.map((c) => c.name)).toEqual(["B"]);
    expect(belowMinimum).toBe(false);
  });

  it("counts opponents with zero votes as contested", () => {
    expect(resolveWinners([cand("A", 4), cand("B", 0)], 10, 75).winners.map((c) => c.name)).toEqual(["A"]);
  });

  it("requires an unopposed candidate to reach 75%", () => {
    expect(resolveWinners([cand("A", 74)], 100, 75).belowMinimum).toBe(true);
    expect(resolveWinners([cand("A", 74)], 100, 75).winners).toEqual([]);
    expect(resolveWinners([cand("A", 75)], 100, 75).winners).toHaveLength(1);
  });

  it("counts abstentions in the base, so they can block a winner", () => {
    // 5 votes for A would beat 50% of the 8 cast for candidates, but 10 ballots include 2 abstentions... 5/10 = 50% passes;
    // with 11 ballots it is 45.45% and fails.
    expect(resolveWinners([cand("A", 5)], 10, 50).winners).toHaveLength(1);
    expect(resolveWinners([cand("A", 5)], 11, 50).winners).toHaveLength(0);
  });

  it("treats exactly the minimum as enough", () => {
    expect(meetsMinimum(1, 3, 33.33)).toBe(true);
    expect(meetsMinimum(1, 3, 33.34)).toBe(false);
  });

  it("never picks a winner with no votes", () => {
    const { winners, belowMinimum } = resolveWinners([cand("A", 0)], 0, 50);
    expect(winners).toEqual([]);
    expect(belowMinimum).toBe(false);
  });
});

describe("analytics summary", () => {
  const input = (minWinnerPercentage?: number) => ({
    election: { id: "e", title: "E", departmentId: "computer_science", status: "closed", minWinnerPercentage },
    positions: [{ id: "p", title: "President" }],
    candidates: [
      { id: "a", fullName: "Alice", positionId: "p" },
      { id: "b", fullName: "Bob", positionId: "p" },
    ],
    eligibleByLevel: { "300": 10 },
    votes: [
      ...["a", "a", "a"].map((candidateId, i) => ({ positionId: "p", candidateId, voterId: `v${i}`, level: "300", votedAt: 0 })),
      ...["b", "abstain", "abstain"].map((candidateId, i) => ({ positionId: "p", candidateId, voterId: `w${i}`, level: "300", votedAt: 0 })),
    ],
  });

  it("names the leader as winner without a minimum", () => {
    const [position] = buildSummary(input()).results.positions;
    expect(position.winner?.name).toBe("Alice");
    expect(position.belowMinimum).toBe(false);
  });

  it("names the contested leader even below the minimum", () => {
    const summary = buildSummary(input(75));
    const [position] = summary.results.positions;
    expect(position.winner?.name).toBe("Alice");
    expect(position.belowMinimum).toBe(false);
    expect(summary.results.winnersBoard).toHaveLength(1);
    expect(position.margin?.voteDifference).toBe(2);
  });

  it("applies the minimum to unopposed candidates", () => {
    const data = input(75);
    data.candidates = data.candidates.slice(0, 1);
    data.votes = data.votes.map((vote) => ({ ...vote, candidateId: vote.candidateId === "b" ? "abstain" : vote.candidateId }));
    const summary = buildSummary(data);
    expect(summary.results.positions[0].winner).toBeNull();
    expect(summary.results.positions[0].belowMinimum).toBe(true);
    expect(summary.results.winnersBoard).toEqual([]);
    data.election.minWinnerPercentage = 50;
    expect(buildSummary(data).results.positions[0].winner?.name).toBe("Alice");
  });

  it("names the winner when the leader reaches the minimum", () => {
    expect(buildSummary(input(50)).results.positions[0].winner?.name).toBe("Alice");
  });
});

describe("election minimum winning percentage", () => {
  const setup = async () => {
    const t = newTest();
    const admin = await addUser(t, { email: "admin@student.babcock.edu.ng", role: "super_admin" });
    const { electionId } = await addElection(t, admin);
    return { asAdmin: asUser(t, admin), t, electionId };
  };

  it("can be set, changed and removed", async () => {
    const { asAdmin, t, electionId } = await setup();
    // `t.run` turns undefined into null, so report whether the field exists at all.
    const read = () =>
      t.run(async (ctx) => {
        const election = (await ctx.db.get(electionId))!;
        return "minWinnerPercentage" in election ? election.minWinnerPercentage : "absent";
      });

    await asAdmin.mutation(api.elections.update, { id: electionId, minWinnerPercentage: 50 });
    expect(await read()).toBe(50);

    // Leaving it out leaves it alone.
    await asAdmin.mutation(api.elections.update, { id: electionId, title: "Renamed" });
    expect(await read()).toBe(50);

    await asAdmin.mutation(api.elections.update, { id: electionId, minWinnerPercentage: null });
    expect(await read()).toBe("absent");
  });

  it("rejects values outside 0 to 100", async () => {
    const { asAdmin, electionId } = await setup();
    for (const bad of [0, -5, 100.5, Number.NaN]) {
      await expect(
        asAdmin.mutation(api.elections.update, { id: electionId, minWinnerPercentage: bad }),
      ).rejects.toMatchObject(failsWith("Minimum winning percentage"));
    }
  });

  it("is copied to demo elections", async () => {
    const { asAdmin, t, electionId } = await setup();
    await asAdmin.mutation(api.elections.update, { id: electionId, minWinnerPercentage: 40 });
    const { id } = await asAdmin.mutation(api.elections.duplicate, { id: electionId });
    expect(await t.run(async (ctx) => (await ctx.db.get(id))!.minWinnerPercentage)).toBe(40);
  });
});
