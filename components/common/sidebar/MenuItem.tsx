"use client";
import React from "react";
import Link from "next/link";
import clsx from "clsx";
import { rippleHandler } from "@t007/utils/hooks/vanilla";
import "@/styles/common/sidebar/MenuItem.css";

export interface MenuItemProps {
  label: string;
  href: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export const MenuItem: React.FC<MenuItemProps> = ({ label, href, icon, active, onClick, className }) => {
  return (
    <Link href={href} onClick={onClick} onPointerDown={(e) => rippleHandler(e, { target: e.currentTarget })} title={label} className={clsx("side-bar-item no-underline relative overflow-hidden flex items-center w-full gap-3", active && "active", className)} aria-current={active ? "page" : undefined}>
      <span className="side-bar-icon-wrapper flex items-center justify-center shrink-0" aria-hidden="true">
        {icon}
      </span>
      <span className="side-bar-label font-semibold truncate">{label}</span>
    </Link>
  );
};

export default MenuItem;
