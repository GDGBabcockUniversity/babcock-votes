"use client";
import React from "react";
import clsx from "clsx";
import Bone from "./Bone";

export const AdminSkeleton: React.FC<{ cards?: number }> = ({ cards = 4 }) => {
  return (
    <div className="flex flex-col flex-1 w-full gap-6 md:gap-8 p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2">
        <Bone className="w-48 h-8" />
        <Bone className="w-72 h-4" />
      </div>
      <div className={clsx("grid gap-4 w-full", cards === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4")}>
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="p-6 rounded-lg border border-border-default bg-bg-surface flex flex-col gap-4">
            <Bone className="w-24 h-4" />
            <Bone className="w-16 h-8" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminSkeleton;
