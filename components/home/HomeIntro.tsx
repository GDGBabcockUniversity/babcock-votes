"use client";
import React from "react";
import SearchIcon from "@icons/common/search.svg";
import Bone from "@/components/common/skeleton/Bone";

export interface HomeIntroProps {
  firstName?: string;
  loading?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
}

export const HomeIntro: React.FC<HomeIntroProps> = ({ firstName, loading, search, onSearchChange }) => {
  return (
    <div className="home-intro flex flex-col w-full gap-3">
      <h1 className="home-intro-greeting font-normal flex items-center gap-2">Hello, {loading ? <Bone className="w-36 sm:w-52 h-8 sm:h-9 rounded-md inline-block align-middle" /> : `${firstName || "Voter"}.`}</h1>
      <p className="home-intro-desc">Elections you can vote in, and the ones coming up.</p>
      <div className="search-bar flex items-center w-full gap-2.5">
        <span className="search-bar-icon flex items-center justify-center shrink-0" aria-hidden="true">
          <SearchIcon className="w-full h-full" />
        </span>
        <input type="search" value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Find your association or department" className="search-bar-input flex-1" aria-label="Find your association or department" />
      </div>
    </div>
  );
};

export default HomeIntro;
