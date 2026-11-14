import { internalMutation, internalQuery, mutation } from "./_generated/server";

export const inspectState = internalQuery({
  args: {},
  handler: async (ctx) => {
    const elections = await ctx.db.query("elections").collect();
    const electionSummaries = [];
    for (const e of elections) {
      const positions = await ctx.db
        .query("positions")
        .withIndex("by_election_order", (q) => q.eq("electionId", e._id))
        .collect();
      const candidates = await ctx.db
        .query("candidates")
        .withIndex("by_election", (q) => q.eq("electionId", e._id))
        .collect();
      const votes = await ctx.db
        .query("votes")
        .withIndex("by_election", (q) => q.eq("electionId", e._id))
        .collect();
      electionSummaries.push({
        id: e._id,
        title: e.title,
        departmentId: e.departmentId,
        status: e.status,
        startDate: e.startDate,
        endDate: e.endDate,
        positions: positions.map((p) => ({
          id: p._id,
          title: p.title,
          order: p.order,
          allowedLevels: p.allowedLevels,
        })),
        candidateCount: candidates.length,
        voteCount: votes.length,
      });
    }

    const users = await ctx.db.query("users").collect();
    const registeredUsers = users
      .filter((u) => !!u.role)
      .map((u) => ({
        id: u._id,
        fullName: u.fullName,
        matricNumber: u.matricNumber,
        departmentId: u.departmentId,
        level: u.level,
        role: u.role,
      }));

    return {
      elections: electionSummaries,
      registeredUsers,
    };
  },
});

export const setupTestElections = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const DAY = 86_400_000;

    // 1. Find super admin or first user to be createdBy
    const adminUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "super_admin"))
      .first();
    const creatorId = adminUser ? adminUser._id : (await ctx.db.query("users").first())!._id;

    // 2. Update existing "BUSA Annual Executive Elections 2026" to "computer_science" so user can vote
    const busa = await ctx.db
      .query("elections")
      .filter((q) => q.eq(q.field("title"), "BUSA Annual Executive Elections 2026"))
      .first();
    if (busa) {
      await ctx.db.patch(busa._id, {
        departmentId: "computer_science",
        status: "active",
        startDate: now - 2 * DAY,
        endDate: now + 7 * DAY,
      });
    }

    // 3. Update existing "BUCOSSA General Elections 2026" dates to active & clear votes so user can re-test
    const bucossa = await ctx.db
      .query("elections")
      .filter((q) => q.eq(q.field("title"), "BUCOSSA General Elections 2026"))
      .first();
    if (bucossa) {
      await ctx.db.patch(bucossa._id, {
        departmentId: "computer_science",
        status: "active",
        startDate: now - 1 * DAY,
        endDate: now + 6 * DAY,
      });

      // Clear any previous votes on bucossa so voter can test voting
      const bucossaVotes = await ctx.db
        .query("votes")
        .withIndex("by_election", (q) => q.eq("electionId", bucossa._id))
        .collect();
      for (const v of bucossaVotes) {
        await ctx.db.delete(v._id);
      }
    }

    // 4. Create new "NACOS Departmental Executive Election 2026"
    const nacos = await ctx.db
      .query("elections")
      .filter((q) => q.eq(q.field("title"), "NACOS Departmental Executive Election 2026"))
      .first();

    if (!nacos) {
      const nacosId = await ctx.db.insert("elections", {
        title: "NACOS Departmental Executive Election 2026",
        description: "Official election for Nigeria Association of Computing Students (NACOS) Babcock Chapter executives.",
        departmentId: "computer_science",
        status: "active",
        startDate: now - 1 * DAY,
        endDate: now + 5 * DAY,
        candidateCount: 6,
        createdBy: creatorId,
        createdAt: now,
      });

      // Position 1: President
      const presPos = await ctx.db.insert("positions", {
        electionId: nacosId,
        title: "President",
        description: "Chief executive officer of NACOS Babcock Chapter.",
        order: 1,
        allowedLevels: [],
      });
      await ctx.db.insert("candidates", {
        electionId: nacosId,
        positionId: presPos,
        fullName: "Adebayo Toluwalase",
        departmentId: "computer_science",
        level: "300",
        manifesto: "Empowering student developers through tech bootcamps, corporate sponsorships, and industry networking.",
      });
      await ctx.db.insert("candidates", {
        electionId: nacosId,
        positionId: presPos,
        fullName: "Somtochukwu Okonkwo",
        departmentId: "computer_science",
        level: "300",
        manifesto: "Advancing open-source research, improving CS lab access, and fostering student developer mentorship.",
      });

      // Position 2: Vice President
      const vpPos = await ctx.db.insert("positions", {
        electionId: nacosId,
        title: "Vice President",
        description: "Supports the president and coordinates internal committees.",
        order: 2,
        allowedLevels: [],
      });
      await ctx.db.insert("candidates", {
        electionId: nacosId,
        positionId: vpPos,
        fullName: "Chiamaka Nwosu",
        departmentId: "computer_science",
        level: "300",
        manifesto: "Bridging the gap between 100L and senior students through peer tutoring and collaborative hackathons.",
      });
      await ctx.db.insert("candidates", {
        electionId: nacosId,
        positionId: vpPos,
        fullName: "Fisayo Daniel",
        departmentId: "computer_science",
        level: "200",
        manifesto: "Ensuring student welfare, transparent budgeting, and active representation across all computing courses.",
      });

      // Position 3: Director of Software & Innovation
      const techPos = await ctx.db.insert("positions", {
        electionId: nacosId,
        title: "Director of Software & Innovation",
        description: "Leads technical projects and student developer initiatives.",
        order: 3,
        allowedLevels: ["300", "400"],
      });
      await ctx.db.insert("candidates", {
        electionId: nacosId,
        positionId: techPos,
        fullName: "Korede Alabi",
        departmentId: "computer_science",
        level: "300",
        manifesto: "Building campus-wide open-source software and hosting algorithmic coding tournaments.",
      });
      await ctx.db.insert("candidates", {
        electionId: nacosId,
        positionId: techPos,
        fullName: "Temidayo Adeleke",
        departmentId: "computer_science",
        level: "400",
        manifesto: "Modernizing computing departmental tools and facilitating tech internship opportunities.",
      });
    }

    // 5. Remove the duplicate demo accounting elections if any exist
    const demoElections = await ctx.db
      .query("elections")
      .filter((q) =>
        q.or(
          q.eq(q.field("title"), "Babcock Accounting Students Association (BASA) 2026 (Demo)"),
          q.eq(q.field("title"), "Babcock Accounting Students Association (BASA) 2026 (Demo) (Demo)"),
        ),
      )
      .collect();

    for (const demo of demoElections) {
      // Remove positions
      const pos = await ctx.db
        .query("positions")
        .withIndex("by_election_order", (q) => q.eq("electionId", demo._id))
        .collect();
      for (const p of pos) await ctx.db.delete(p._id);

      // Remove candidates
      const cands = await ctx.db
        .query("candidates")
        .withIndex("by_election", (q) => q.eq("electionId", demo._id))
        .collect();
      for (const c of cands) await ctx.db.delete(c._id);

      // Remove election
      await ctx.db.delete(demo._id);
    }

    return { success: true };
  },
});

export const resetAllVotes = mutation({
  args: {},
  handler: async (ctx) => {
    const allVotes = await ctx.db.query("votes").collect();
    for (const v of allVotes) {
      await ctx.db.delete(v._id);
    }
    const elections = await ctx.db.query("elections").collect();
    for (const e of elections) {
      if (e.departmentId === "cosc") {
        await ctx.db.patch(e._id, { departmentId: "computer_science" });
      }
    }
    const candidates = await ctx.db.query("candidates").collect();
    for (const c of candidates) {
      if (c.departmentId === "cosc") {
        await ctx.db.patch(c._id, { departmentId: "computer_science" });
      }
    }
    return { clearedVotes: allVotes.length };
  },
});

