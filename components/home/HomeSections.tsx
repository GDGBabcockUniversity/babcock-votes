"use client";
import React from "react";
import Link from "next/link";
import { PAGES } from "@/lib/constants";
import type { Election } from "@/lib/types";
import ElectionCard from "./ElectionCard";
import { ElectionCardSkeleton } from "@/components/common/skeleton";

export interface HomeSectionsProps {
  openElections: Election[];
  upcomingElections: Election[];
  loading: boolean;
  hasSearchQuery: boolean;
  query?: string;
}

export const HomeSections: React.FC<HomeSectionsProps> = ({ openElections, upcomingElections, loading, hasSearchQuery, query }) => {
  if (loading)
    return (
      <div className="home-sections flex flex-col w-full gap-8">
        <section className="home-section flex flex-col w-full gap-4">
          <div className="home-section-header flex items-center justify-between w-full gap-4">
            <h2 className="home-section-title">Open now</h2>
          </div>
          <div className="home-cards-grid grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
            <ElectionCardSkeleton />
            <ElectionCardSkeleton />
          </div>
        </section>
      </div>
    );

  if (openElections.length === 0 && upcomingElections.length === 0)
    return (
      <div className="home-empty flex items-center justify-center w-full">
        <p>{hasSearchQuery ? "No elections match your search." : "No active or upcoming elections available right now."}</p>
      </div>
    );

  return (
    <div className="home-sections flex flex-col w-full gap-8">
      {openElections.length > 0 && (
        <section className="home-section flex flex-col w-full gap-4">
          <div className="home-section-header flex items-center justify-between w-full gap-4">
            <h2 className="home-section-title">Open now</h2>
            <Link href={PAGES.main.elections} className="home-section-link no-underline hover:underline">
              See all elections
            </Link>
          </div>
          <div className="home-cards-grid grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
            {openElections.map((election) => (
              <ElectionCard key={election.id} election={election} query={query} />
            ))}
          </div>
        </section>
      )}
      {upcomingElections.length > 0 && (
        <section className="home-section flex flex-col w-full gap-4">
          <div className="home-section-header flex items-center justify-between w-full gap-4">
            <h2 className="home-section-title">Coming up</h2>
          </div>
          <div className="home-cards-grid grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
            {upcomingElections.map((election) => (
              <ElectionCard key={election.id} election={election} query={query} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default HomeSections;
