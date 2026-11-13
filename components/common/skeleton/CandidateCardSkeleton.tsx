"use client";
import React from "react";
import clsx from "clsx";
import Bone from "./Bone";

export interface CandidateCardSkeletonProps {
  size?: "regular" | "compact";
  className?: string;
}

export const CandidateCardSkeleton: React.FC<CandidateCardSkeletonProps> = ({ size = "regular", className }) => {
  const isCompact = size === "compact";

  return (
    <div className={clsx("skeleton-card skeleton-candidate flex relative overflow-hidden select-none", isCompact ? "flex-col gap-3" : "items-center gap-4", className)} aria-hidden="true">
      {isCompact ? (
        <>
          <div className="flex items-center w-full gap-3">
            <Bone className="size-14 rounded-sm shrink-0" />
            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
              <Bone className="w-32 h-5" />
              <Bone className="w-24 h-3.5" />
            </div>
            <Bone className="size-12 rounded-sm shrink-0" />
          </div>
          <Bone className="w-full h-4 mt-1" />
        </>
      ) : (
        <>
          <Bone className="size-20 rounded-sm shrink-0" />
          <div className="flex-1 flex flex-col gap-2 min-w-0">
            <Bone className="w-44 h-6" />
            <Bone className="w-28 h-3.5" />
            <Bone className="w-full h-4 mt-1" />
          </div>
          <Bone className="size-14 rounded-sm shrink-0" />
        </>
      )}
    </div>
  );
};

export default CandidateCardSkeleton;
