"use client";
import React from "react";
import Chip from "@/components/common/Chip";
import Bone from "./Bone";
import ThumbprintIcon from "@icons/common/thumbprint-icon.svg";
import "@/styles/ballot/success.css";

export const BallotConfirmationSkeleton: React.FC = () => {
  return (
    <div className="ballot-confirmation-wrap w-full flex items-center justify-center">
      <div className="ballot-success-container flex flex-col items-center w-full mx-auto text-center gap-6">
        <div className="ballot-success-stamp flex items-center justify-center shrink-0">
          <span className="flex items-center justify-center rotate-[14deg]">
            <ThumbprintIcon className="ballot-success-thumb" />
          </span>
        </div>
        <div>
          <Chip text="Vote recorded" tone="ok" />
        </div>
        <div className="flex flex-col items-center gap-2 w-full">
          <Bone className="w-64 max-w-full h-8 rounded-md" />
          <Bone className="w-96 max-w-full h-4 rounded-sm" />
        </div>
        <div className="ballot-receipt-box flex flex-col w-full gap-4">
          <div className="flex items-center justify-between w-full gap-1">
            <Bone className="w-20 h-4 rounded-sm shrink-0" />
            <Bone className="w-44 h-4 rounded-sm" />
          </div>
          <div className="flex items-center justify-between w-full pt-3 border-t border-border-default gap-1">
            <Bone className="w-24 h-4 rounded-sm shrink-0" />
            <Bone className="w-36 h-4 rounded-sm" />
          </div>
          <div className="flex items-center justify-between w-full pt-3 border-t border-border-default gap-1">
            <Bone className="w-28 h-4 rounded-sm shrink-0" />
            <Bone className="w-32 h-4 rounded-sm" />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <Bone className="w-full sm:flex-1 h-12 rounded-lg" />
          <Bone className="w-full sm:flex-1 h-12 rounded-lg" />
        </div>
      </div>
    </div>
  );
};

export default BallotConfirmationSkeleton;
