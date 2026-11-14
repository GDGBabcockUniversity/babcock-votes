"use client";
import React from "react";
import Bone from "./Bone";
import CandidateCardSkeleton from "./CandidateCardSkeleton";
import "@/styles/elections/preview.css";

export const ElectionPreviewSkeleton: React.FC = () => {
  return (
    <div className="election-preview-page flex flex-col flex-1 w-full gap-6 lg:gap-8 mx-auto" aria-hidden="true">
      <div className="flex flex-col gap-1 w-full">
        <Bone className="w-28 h-4 mb-2" />
        <div className="election-preview-header flex flex-col w-full gap-5">
          <div className="flex items-center justify-between flex-wrap gap-3 w-full">
            <div className="flex items-center gap-3">
              <Bone className="w-64 h-9 rounded-md" />
              <Bone className="w-24 h-6 rounded-full" />
            </div>
            <Bone className="w-28 h-10 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <Bone className="w-40 h-4" />
            <Bone className="w-32 h-4" />
          </div>
          <Bone className="w-full h-12 rounded-sm" />
        </div>
      </div>
      <div className="flex flex-col gap-8 w-full">
        {[0, 1].map((p) => (
          <div key={p} className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-1">
              <Bone className="w-40 h-7" />
              <Bone className="w-24 h-5 rounded-full" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CandidateCardSkeleton />
              <CandidateCardSkeleton />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ElectionPreviewSkeleton;
