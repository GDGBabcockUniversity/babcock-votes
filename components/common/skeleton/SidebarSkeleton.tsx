"use client";
import React from "react";
import Bone from "./Bone";

export interface SidebarSkeletonProps {
  count?: number;
}

const DEFAULT_WIDTHS = ["w-20", "w-28", "w-24", "w-24", "w-28"];

export const SidebarSkeleton: React.FC<SidebarSkeletonProps> = ({ count = 5 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="side-bar-item flex items-center w-full gap-3 pointer-events-none" aria-hidden="true">
          <span className="side-bar-icon-wrapper flex items-center justify-center shrink-0">
            <Bone className="w-5 h-5 rounded-md" />
          </span>
          <Bone className={`side-bar-label ${DEFAULT_WIDTHS[i % DEFAULT_WIDTHS.length]} h-3.5 rounded-sm`} />
        </div>
      ))}
    </>
  );
};

export default SidebarSkeleton;
