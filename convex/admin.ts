import { query } from "./_generated/server";
import { isRegistered, requireAdmin } from "./lib/access";

/**
 * One transaction may scan 32,000 documents and this query reads elections,
 * users and votes, so each unbounded count stops short of its own share of that
 * budget. A capped count says so, letting the card render "20,000+" instead of
 * a number that is quietly wrong.
 */
const VOTE_CAP = 20_000;
const USER_CAP = 10_000;

/** Numbers for the admin dashboard, scoped to the admin's department unless they're a super admin. */
export const dashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const admin = await requireAdmin(ctx);
    const isSuper = admin.role === "super_admin";

    const elections = (await ctx.db.query("elections").take(500)).filter(
      (e) => isSuper || e.departmentId === admin.departmentId,
    );

    const userRows = await (isSuper
      ? ctx.db.query("users").take(USER_CAP + 1)
      : ctx.db
          .query("users")
          .withIndex("by_department", (q) =>
            q.eq("departmentId", admin.departmentId),
          )
          .take(USER_CAP + 1));
    // Someone who signed in but never registered isn't a voter yet.
    const registered = userRows.filter(isRegistered);

    // "Votes cast" is a super-admin figure; department admins read their own
    // election results instead, so skip the scan entirely for them.
    const voteRows = isSuper
      ? await ctx.db.query("votes").take(VOTE_CAP + 1)
      : [];

    return {
      totalElections: elections.length,
      activeElections: elections.filter((e) => e.status === "active").length,
      totalVotes: Math.min(voteRows.length, VOTE_CAP),
      totalVotesCapped: voteRows.length > VOTE_CAP,
      totalUsers: Math.min(registered.length, USER_CAP),
      totalUsersCapped: userRows.length > USER_CAP,
    };
  },
});
