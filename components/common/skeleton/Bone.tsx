"use client";
import React from "react";
import clsx from "clsx";
import "@/styles/common/Skeleton.css";

export interface BoneProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Bone: React.FC<BoneProps> = ({ className, ...props }) => {
  return <div className={clsx("skeleton-bone relative overflow-hidden max-w-full", className)} aria-hidden="true" {...props} />;
};

export default Bone;
