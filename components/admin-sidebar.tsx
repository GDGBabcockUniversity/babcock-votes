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
  ArrowLeft,
  LogOut,
} from "lucide-react";
import { PAGES } from "@/lib/constants";
import { getDepartmentName } from "@/lib/utils";

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
];

export const AdminSidebar = () => {
  const pathname = usePathname();
  const { userProfile, signOut } = useAuth();
  const role = userProfile?.role ?? "voter";

  const filtered = navItems.filter((item) => item.roles.includes(role));

  return (
    <Sidebar>
      <SidebarHeader className="h-14 flex-row items-center justify-center border-b border-sidebar-border px-4">
        <span className="font-sans text-sm font-bold uppercase tracking-widest">
          Babcock Votes
        </span>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-sans text-[10px] uppercase tracking-widest">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
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
                      className="font-sans rounded-none"
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

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href={PAGES.main.home} />}
              className="font-sans rounded-none"
            >
              <ArrowLeft className="size-4" />
              <span>Back to Voting</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={signOut}
              className="font-sans rounded-none text-red-600 hover:text-red-600"
            >
              <LogOut className="size-4" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {userProfile && (
          <div className="border-t border-sidebar-border px-2 py-3 font-sans">
            <p className="truncate text-sm font-medium">
              {userProfile.fullName}
            </p>
            <p className="truncate text-xs text-muted-gray">
              {role === "super_admin" ? "Super Admin" : "Dept Admin"} &middot;{" "}
              {getDepartmentName(userProfile.departmentId)}
            </p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};
