"use client";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useAuth } from "@/context/auth-context";
import { PAGES } from "@/lib/constants";
import { usePath } from "sia-reactor/adapters/react";
import { formatKeyTooltip, parseForARIAKS } from "sia-reactor/utils";
import { KEY_SHORTCUTS } from "../KeyHandler";
import { store, toggleSidebar } from "@/context/app-store";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { rippleHandler } from "@t007/utils/hooks/vanilla";
import { confirm } from "@t007/dialog";
import MenuItem from "./MenuItem";
import SidebarSkeleton from "@/components/common/skeleton/SidebarSkeleton";
import { voterMenuItems, adminMenuItems } from "./menuItems";
import BallotIcon from "@icons/common/ballot.svg";
import LogoutIcon from "@icons/common/logout.svg";
import SidebarToggleIcon from "@icons/common/sidebar-toggle.svg";
import "@/styles/common/sidebar/Sidebar.css";

export interface SidebarProps {
  variant?: "voter" | "admin";
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ variant = "voter", className }) => {
  const pathname = usePathname();
  const { userProfile, signOut } = useAuth();
  const [mounted, setMounted] = useState(false);
  const sidebarOpen = usePath(store, "ui.sidebarOpen");
  const open = !mounted || sidebarOpen;
  const items = (variant === "admin" ? adminMenuItems : voterMenuItems).filter((item) => !item.roles || (userProfile && item.roles.includes(userProfile.role)));

  const isItemActive = useCallback((href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || (href !== "/" && pathname.startsWith(href))), [pathname]);
  const handleItemClick = () => window.innerWidth < 768 && toggleSidebar(false);
  const handleSignOut = async () => {
    handleItemClick();
    if (await confirm("Are you sure you want to log out?", { id: "signout-dialog", confirmText: "Log out", cancelText: "Cancel" })) await signOut();
  };

  useEffect(() => setMounted(true), []);

  return (
    <aside id="side-bar" className={clsx("side-bar flex shrink-0", !open && "close", className)} aria-label="Sidebar navigation">
      <div onClick={() => toggleSidebar(false)} className="side-bar-backdrop" aria-hidden="true" />
      <div className="side-bar-content flex flex-col justify-between w-full h-full">
        <div className="flex flex-col w-full">
          <div className="side-bar-top-section relative flex items-center justify-between w-full">
            <Link href={variant === "admin" ? PAGES.admin.dashboard : PAGES.main.home} onClick={handleItemClick} className="side-bar-logo-wrapper no-underline flex items-center shrink-0 gap-3">
              <span className="side-bar-brand-logo flex items-center justify-center shrink-0" aria-hidden="true">
                <BallotIcon className="w-full h-full" />
              </span>
              <span className="side-bar-brand-title font-bold whitespace-nowrap">Babcock Votes</span>
            </Link>
            <button type="button" onClick={() => toggleSidebar()} className="side-bar-toggler relative overflow-hidden hidden md:flex shrink-0" aria-label={!open ? "Expand sidebar" : "Collapse sidebar"} title={`${!open ? "Expand" : "Collapse"} sidebar${formatKeyTooltip(KEY_SHORTCUTS.toggleSidebar)}`} aria-keyshortcuts={parseForARIAKS(KEY_SHORTCUTS.toggleSidebar)}>
              <SidebarToggleIcon className="side-bar-toggler-icon" />
            </button>
            <button type="button" onClick={() => toggleSidebar(false)} className="side-bar-close-btn md:hidden shrink-0" aria-label="Close sidebar">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="4" x2="16" y2="16" />
                <line x1="16" y1="4" x2="4" y2="16" />
              </svg>
            </button>
          </div>
          <nav className="side-bar-nav flex flex-col w-full gap-1" aria-label="Main menu">
            {!userProfile ? <SidebarSkeleton count={variant === "admin" ? 5 : 3} /> : items.map((item) => <MenuItem key={item.href} label={item.label} href={item.href} icon={item.icon} active={isItemActive(item.href, item.exact)} onClick={handleItemClick} />)}
          </nav>
        </div>
        <div className={clsx("side-bar-bottom flex items-center justify-between w-full shrink-0 mt-auto", !open && "gap-3")}>
          <button type="button" onClick={handleSignOut} onPointerDown={(e) => rippleHandler(e, { target: e.currentTarget })} className={clsx("side-bar-signout relative overflow-hidden flex items-center gap-2", !open && "w-full")} aria-label="Sign out" title="Sign out">
            <span className="side-bar-signout-icon flex items-center justify-center shrink-0" aria-hidden="true">
              <LogoutIcon className="w-full h-full" />
            </span>
            <span className="side-bar-signout-text font-semibold whitespace-nowrap">Sign out</span>
          </button>
          <div className="side-bar-theme-toggle flex items-center justify-center shrink-0">
            <ThemeToggle collapsed={!open} />
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
