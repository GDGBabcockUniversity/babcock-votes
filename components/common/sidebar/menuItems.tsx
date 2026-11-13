import React from "react";
import HomeIcon from "@icons/common/home.svg";
import BallotIcon from "@icons/common/ballot.svg";
import UserIcon from "@icons/common/user.svg";
import { PAGES } from "@/lib/constants";

export interface SidebarMenuItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
  exact?: boolean;
}

export const voterMenuItems: SidebarMenuItem[] = [
  { label: "Home", href: PAGES.main.home, icon: <HomeIcon aria-hidden />, exact: true },
  { label: "Elections", href: PAGES.main.elections, icon: <BallotIcon aria-hidden /> },
  { label: "Profile", href: PAGES.main.profile, icon: <UserIcon aria-hidden /> },
];

export const adminMenuItems: SidebarMenuItem[] = [
  { label: "Dashboard", href: PAGES.admin.dashboard, icon: <HomeIcon aria-hidden />, roles: ["super_admin", "dept_admin"], exact: true },
  { label: "Elections", href: PAGES.admin.elections, icon: <BallotIcon aria-hidden />, roles: ["super_admin", "dept_admin"] },
  { label: "Eligible Voters", href: PAGES.admin.eligibleVoters, icon: <UserIcon aria-hidden />, roles: ["super_admin"] },
  { label: "Users", href: PAGES.admin.users, icon: <UserIcon aria-hidden />, roles: ["super_admin"] },
  { label: "Live Results", href: PAGES.admin.liveResults, icon: <BallotIcon aria-hidden />, roles: ["viewer", "super_admin", "dept_admin"] },
];
