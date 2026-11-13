"use client";
import React, { useState, useMemo, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/context/auth-context";
import { useArrowNavigation } from "@t007/utils/hooks/react";
import { filterVisibleElections } from "@/lib/election-visibility";
import { DEPARTMENTS } from "@/lib/constants";
import type { Election } from "@/lib/types";
import ElectionsIntro, { type ElectionFilter } from "./ElectionsIntro";
import ElectionsList from "./ElectionsList";
import Footer from "@/components/common/Footer";
import "@/styles/elections/elections.css";

export const Elections: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null!);
  const { userProfile } = useAuth();
  const electionsData = useQuery(api.elections.list, {});

  const loading = electionsData === undefined;
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ElectionFilter>("all");

  const elections: Election[] = useMemo(() => electionsData ?? [], [electionsData]);
  const visibleElections = useMemo(() => filterVisibleElections(elections, userProfile), [elections, userProfile]);
  const departmentMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const dept of DEPARTMENTS) map.set(dept.id, dept.name.toLowerCase());
    return map;
  }, []);
  const counts = useMemo(() => {
    let active = 0;
    let upcoming = 0;
    let closed = 0;
    for (const e of visibleElections)
      if (e.status === "active") active++;
      else if (e.status === "upcoming") upcoming++;
      else if (e.status === "closed") closed++;
    return { all: visibleElections.length, active, upcoming, closed };
  }, [visibleElections]);
  const filteredElections = useMemo(() => {
    const query = search.trim().toLowerCase();
    return visibleElections.filter((e) => (filter === "all" || e.status === filter) && (!query || e.title.toLowerCase().includes(query) || (departmentMap.get(e.departmentId) ?? e.departmentId.toLowerCase()).includes(query)));
  }, [visibleElections, filter, search, departmentMap]);
  const hasFilters = search.trim().length > 0 || filter !== "all";

  useArrowNavigation(containerRef, { virtual: true, grid: { x: 1 } });

  return (
    <div ref={containerRef} className="elections-page flex flex-col flex-1 w-full gap-6 lg:gap-8 mx-auto">
      <ElectionsIntro search={search} onSearchChange={setSearch} activeFilter={filter} onFilterChange={setFilter} counts={counts} />
      <ElectionsList elections={filteredElections} loading={loading} hasFilters={hasFilters} query={search} />
      <Footer className="elections-footer" />
    </div>
  );
};

export default Elections;
