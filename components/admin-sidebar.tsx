"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Vote,
  Users,
  ClipboardList,
  BarChart3,
  ArrowLeft,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { PAGES } from "@/lib/constants";
import { getDepartmentName } from "@/lib/utils";
import { toggleTheme } from "@/components/theme-toggle";

const navItems = [
  {
    href: PAGES.admin.dashboard,
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["super_admin", "dept_admin"],
  },
  {
    href: PAGES.admin.elections,
    label: "Elections",
    icon: Vote,
    roles: ["super_admin", "dept_admin"],
  },
  {
    href: PAGES.admin.users,
    label: "Users",
    icon: Users,
    roles: ["super_admin"],
  },
  {
    href: PAGES.admin.eligibleVoters,
    label: "Eligible Voters",
    icon: ClipboardList,
    roles: ["super_admin"],
  },
  {
    href: PAGES.admin.liveResults,
    label: "Live Results",
    icon: BarChart3,
    roles: ["viewer"],
  },
];

const roleLabel: Record<string, string> = {
  super_admin: "Super Admin",
  dept_admin: "Dept Admin",
  viewer: "Viewer",
};

export const AdminSidebar = () => {
  const pathname = usePathname();
  const { userProfile, signOut } = useAuth();
  const role = userProfile?.role ?? "voter";

  const filtered = navItems.filter((item) => item.roles.includes(role));

  return (
    <Sidebar>
      <SidebarHeader className="flex h-14 flex-row items-center border-b border-sidebar-border px-5">
        <span className="font-sans text-sm font-bold uppercase tracking-widest">
          Babcock Votes
        </span>
      </SidebarHeader>

      <SidebarContent className="px-2 pt-4">
        <SidebarGroup>
          <SidebarGroupLabel className="mb-1 px-3 font-sans text-[10px] uppercase tracking-widest text-muted-gray">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {filtered.map((item) => {
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      render={<Link href={item.href} />}
                      size="lg"
                      className="rounded-sm px-3 font-sans"
                    >
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="px-2 pb-4">
        <SidebarMenu className="gap-1">
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href={PAGES.main.home} />}
              className="rounded-sm px-3 font-sans"
            >
              <ArrowLeft className="size-4" />
              <span>Back to Voting</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleTheme}
              className="rounded-sm px-3 font-sans"
            >
              <Sun className="hidden size-4 dark:block" />
              <Moon className="size-4 dark:hidden" />
              <span className="dark:hidden">Dark mode</span>
              <span className="hidden dark:inline">Light mode</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={signOut}
              className="rounded-sm px-3 font-sans text-red-600 dark:text-red-400 hover:text-red-600 dark:hover:text-red-400"
            >
              <LogOut className="size-4" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {userProfile && (
          <div className="mt-2 border-t border-sidebar-border px-3 pt-3 font-sans">
            <p className="truncate text-sm font-medium">
              {userProfile.fullName}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-gray">
              {roleLabel[role] ?? role} &middot;{" "}
              {getDepartmentName(userProfile.departmentId)}
            </p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};
