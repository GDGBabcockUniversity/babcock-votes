"use client";
import React from "react";
import clsx from "clsx";
import "@/styles/common/Chip.css";

export interface ChipProps {
  text: string;
  tone?: "ok" | "neutral" | "ink";
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({ text, tone = "ok", className }) => {
  return <span className={clsx("chip inline-flex items-center justify-center font-semibold whitespace-nowrap select-none", `tone-${tone}`, className)}>{text}</span>;
};

export default Chip;
