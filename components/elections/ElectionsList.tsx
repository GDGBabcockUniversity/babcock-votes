"use client";
import React from "react";
import type { Election } from "@/lib/types";
import ElectionCard from "@/components/home/ElectionCard";
import { ElectionCardSkeleton } from "@/components/common/skeleton";

interface ElectionsListProps {
  elections: Election[];
  loading: boolean;
  hasFilters: boolean;
  query?: string;
}

export const ElectionsList: React.FC<ElectionsListProps> = ({ elections, loading, hasFilters, query }) => {
  if (loading)
    return (
      <div className="elections-grid grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
        <ElectionCardSkeleton />
        <ElectionCardSkeleton />
        <ElectionCardSkeleton />
        <ElectionCardSkeleton />
      </div>
    );

  if (elections.length === 0)
    return (
      <div className="elections-empty flex flex-col items-center justify-center text-center w-full">
        <p className="font-normal">{hasFilters ? "No elections match your search or filter." : "No elections available right now."}</p>
      </div>
    );

  return (
    <div className="elections-grid grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
      {elections.map((election) => (
        <ElectionCard key={election.id} election={election} query={query} />
      ))}
    </div>
  );
};

export default ElectionsList;
