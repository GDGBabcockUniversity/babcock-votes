"use client";
import React from "react";
import clsx from "clsx";
import Bone from "./Bone";
import "@/styles/home/ElectionCard.css";

export const ElectionCardSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={clsx("election-card flex flex-col justify-between gap-4 select-none", className)} aria-hidden="true">
      <div className="flex items-center justify-between w-full gap-1">
        <Bone className="w-24 h-6 rounded-full" />
        <Bone className="w-28 h-4" />
      </div>
      <div className="flex flex-col gap-2 w-full">
        <Bone className="w-3/4 h-6" />
        <Bone className="w-1/2 h-4" />
      </div>
      <Bone className="w-28 h-4 mt-auto" />
    </div>
  );
};

export default ElectionCardSkeleton;
