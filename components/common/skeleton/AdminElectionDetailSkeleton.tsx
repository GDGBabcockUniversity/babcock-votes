"use client";
import React from "react";
import Bone from "./Bone";
import "@/styles/admin/election-detail.css";

export const AdminElectionDetailSkeleton: React.FC = () => {
  return (
    <div className="admin-detail-page flex flex-col flex-1 w-full gap-6 md:gap-8 mx-auto" aria-hidden="true">
      <div className="flex flex-col gap-1 w-full">
        <Bone className="w-28 h-4 rounded-sm" />
      </div>
      <div className="admin-detail-header flex items-start justify-between flex-wrap w-full gap-5">
        <div className="flex items-center gap-4 min-w-0">
          <Bone className="w-12 h-12 rounded-full shrink-0" />
          <div className="flex flex-col gap-2 min-w-0">
            <Bone className="w-64 max-w-full h-8 rounded-md" />
            <div className="flex items-center gap-2">
              <Bone className="w-28 h-4 rounded-sm" />
              <Bone className="w-16 h-5 rounded-full" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Bone className="w-24 h-9 rounded-md" />
          <Bone className="w-20 h-9 rounded-md" />
          <Bone className="w-24 h-9 rounded-md" />
        </div>
      </div>
      <Bone className="w-96 max-w-full h-4 rounded-sm" />
      <div className="admin-dates-bar flex items-center gap-6 flex-wrap w-full">
        <Bone className="w-48 h-4 rounded-sm" />
        <Bone className="w-48 h-4 rounded-sm" />
      </div>
      <div className="flex items-center justify-between w-full pt-4 border-t border-border-default gap-1">
        <Bone className="w-32 h-6 rounded-md" />
        <Bone className="w-28 h-9 rounded-md" />
      </div>
      <div className="flex flex-col gap-4 w-full">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="admin-position-card p-5 rounded-lg border border-border-default bg-bg-surface flex flex-col gap-4">
            <div className="flex items-center justify-between w-full gap-1">
              <div className="flex items-center gap-3">
                <Bone className="w-36 h-6 rounded-md" />
                <Bone className="w-20 h-5 rounded-full" />
              </div>
              <div className="flex items-center gap-2">
                <Bone className="w-8 h-8 rounded-md" />
                <Bone className="w-8 h-8 rounded-md" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {Array.from({ length: 2 }).map((_, j) => (
                <div key={j} className="p-3 rounded-md border border-border-default flex items-center gap-3">
                  <Bone className="w-10 h-10 rounded-full shrink-0" />
                  <div className="flex flex-col gap-1 flex-1">
                    <Bone className="w-24 h-4 rounded-sm" />
                    <Bone className="w-16 h-3 rounded-sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminElectionDetailSkeleton;
