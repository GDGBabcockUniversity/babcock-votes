"use client";
import React from "react";
import clsx from "clsx";
import SearchIcon from "@icons/common/search.svg";

export type ElectionFilter = "all" | "active" | "upcoming" | "closed";

interface ElectionsIntroProps {
  search: string;
  onSearchChange: (value: string) => void;
  activeFilter: ElectionFilter;
  onFilterChange: (filter: ElectionFilter) => void;
  counts: { all: number; active: number; upcoming: number; closed: number };
}

const FILTERS: { key: ElectionFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Open" },
  { key: "upcoming", label: "Upcoming" },
  { key: "closed", label: "Closed" },
];

export const ElectionsIntro: React.FC<ElectionsIntroProps> = ({ search, onSearchChange, activeFilter, onFilterChange, counts }) => {
  return (
    <div className="elections-intro flex flex-col w-full gap-3">
      <div className="flex flex-col">
        <h1 className="elections-title font-normal">Elections</h1>
        <p className="elections-subtitle font-normal">Find your association and see its elections.</p>
      </div>
      <div className="elections-controls flex flex-col w-full gap-4">
        <div className="search-bar flex items-center w-full gap-2.5">
          <span className="search-bar-icon flex items-center justify-center shrink-0" aria-hidden="true">
            <SearchIcon className="w-full h-full" />
          </span>
          <input type="text" value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search by association" aria-label="Search elections by association" className="search-bar-input flex-1 min-w-0" />
        </div>
        <div className="elections-filters flex items-center flex-wrap gap-2" role="tablist" aria-label="Filter elections by status">
          {FILTERS.map((f) => {
            const isActive = activeFilter === f.key;
            return (
              <button key={f.key} type="button" role="tab" aria-selected={isActive} onClick={() => onFilterChange(f.key)} className={clsx("elections-filter-pill flex items-center whitespace-nowrap select-none font-semibold gap-1.5", isActive && "active")}>
                <span>{f.label}</span>
                <span className="pill-count">{counts[f.key]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ElectionsIntro;
