"use client";
import React, { useState, useMemo, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/context/auth-context";
import { useArrowNavigation } from "@t007/utils/hooks/react";
import { filterVisibleElections } from "@/lib/election-visibility";
import { DEPARTMENTS } from "@/lib/constants";
import type { Election } from "@/lib/types";
import HomeIntro from "./HomeIntro";
import HomeSections from "./HomeSections";
import Footer from "@/components/common/Footer";
import "@/styles/home/home.css";

export const Home: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null!);
  const { userProfile, loading: authLoading } = useAuth();
  const electionsData = useQuery(api.elections.list, { limit: 20 });

  const loading = electionsData === undefined;
  const [search, setSearch] = useState("");

  const elections: Election[] = useMemo(() => electionsData ?? [], [electionsData]);
  const visibleElections = useMemo(() => filterVisibleElections(elections, userProfile), [elections, userProfile]);
  const departmentMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const dept of DEPARTMENTS) map.set(dept.id, dept.name.toLowerCase());
    return map;
  }, []);
  const filteredElections = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return visibleElections;
    return visibleElections.filter((e) => e.title.toLowerCase().includes(query) || (departmentMap.get(e.departmentId) ?? e.departmentId.toLowerCase()).includes(query));
  }, [visibleElections, search, departmentMap]);
  const openElections = useMemo(() => filteredElections.filter((e) => e.status === "active"), [filteredElections]);
  const upcomingElections = useMemo(() => filteredElections.filter((e) => e.status === "upcoming"), [filteredElections]);

  useArrowNavigation(containerRef, { virtual: true, grid: { x: 1 } });

  return (
    <div ref={containerRef} className="home-page flex flex-col flex-1 w-full gap-6 lg:gap-9 mx-auto">
      <HomeIntro firstName={userProfile?.fullName.trim().split(/\s+/)[0]} loading={authLoading} search={search} onSearchChange={setSearch} />
      <HomeSections openElections={openElections} upcomingElections={upcomingElections} loading={loading} hasSearchQuery={search.trim().length > 0} query={search} />
      <Footer className="home-footer" />
    </div>
  );
};

export default Home;
