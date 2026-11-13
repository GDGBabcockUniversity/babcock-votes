"use client";
import React from "react";
import Bone from "./Bone";
import CandidateCardSkeleton from "./CandidateCardSkeleton";
import "@/styles/ballot/ballot.css";
import "@/styles/ballot/choose.css";

export interface BallotSkeletonProps {
  withSidebar?: boolean;
}

export const BallotSkeleton: React.FC<BallotSkeletonProps> = ({ withSidebar = true }) => {
  return (
    <div className="ballot-page-wrapper w-full mx-auto" aria-hidden="true">
      <div className="ballot-choose-container w-full flex flex-col gap-8">
        <div className="ballot-header flex flex-col w-full gap-4">
          <div className="flex items-center gap-3">
            <Bone className="w-16 h-6 rounded-full" />
            <Bone className="w-16 h-6 rounded-full" />
            <Bone className="w-16 h-6 rounded-full" />
          </div>
          <Bone className="w-72 h-10" />
          <Bone className="w-96 h-5" />
        </div>
        <div className={withSidebar ? "grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] items-start w-full gap-12" : "flex flex-col w-full"}>
          <div className="flex flex-col w-full gap-8">
            {[0, 1].map((p) => (
              <div key={p} className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-1">
                  <Bone className="w-48 h-7" />
                  <Bone className="w-20 h-6 rounded-full" />
                </div>
                <div className="flex flex-col gap-3">
                  <CandidateCardSkeleton />
                  <CandidateCardSkeleton />
                </div>
              </div>
            ))}
          </div>
          {withSidebar && (
            <div className="hidden lg:flex flex-col w-80 p-6 rounded-xl border border-border-default bg-bg-surface gap-4 shrink-0">
              <Bone className="w-32 h-6" />
              <div className="flex flex-col gap-3">
                <Bone className="w-full h-8" />
                <Bone className="w-full h-8" />
                <Bone className="w-full h-8" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BallotSkeleton;
