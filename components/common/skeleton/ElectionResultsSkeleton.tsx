"use client";
import React from "react";
import Bone from "./Bone";
import "@/styles/elections/results.css";

export const ElectionResultsSkeleton: React.FC = () => {
  return (
    <div className="election-results-page flex flex-col flex-1 w-full gap-8">
      <div className="flex flex-col gap-3">
        <Bone className="w-24 h-4" />
        <div className="flex items-center gap-3">
          <Bone className="w-72 h-9" />
          <Bone className="w-20 h-6 rounded-full" />
        </div>
        <Bone className="w-48 h-4" />
      </div>
      <div className="election-results-stat-grid grid grid-cols-1 sm:grid-cols-3 w-full gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="election-results-stat-card flex flex-col justify-between gap-3 p-4">
            <Bone className="w-28 h-4" />
            <Bone className="w-16 h-8" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-6 w-full">
        {[0, 1].map((p) => (
          <div key={p} className="election-position-card flex flex-col w-full gap-4 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-border-default gap-1">
              <Bone className="w-40 h-6" />
              <Bone className="w-32 h-6 rounded-full" />
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between gap-1">
                  <Bone className="w-36 h-4" />
                  <Bone className="w-24 h-4" />
                </div>
                <Bone className="w-full h-3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ElectionResultsSkeleton;
