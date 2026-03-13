"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Vote,
  Users,
  ArrowLeft,
  LogOut,
  X,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, roles: ["super_admin", "dept_admin"] },
  { href: "/admin/elections", label: "Elections", icon: Vote, roles: ["super_admin", "dept_admin"] },
  { href: "/admin/users", label: "Users", icon: Users, roles: ["super_admin"] },
];

export const AdminSidebar = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const pathname = usePathname();
  const { userProfile, signOut } = useAuth();
  const role = userProfile?.role ?? "voter";

  const filtered = navItems.filter((item) => item.roles.includes(role));

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-white transition-transform duration-200 md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <span className="text-xs md:text-sm lg:text-base font-bold uppercase tracking-widest font-sans">
            Babcock Votes
          </span>
          <button onClick={onClose} className="md:hidden">
            <X className="size-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {filtered.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 font-sans px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-gold/10 font-semibold text-gold"
                    : "text-muted-gray hover:bg-secondary hover:text-charcoal",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Separator />

        {/* Footer */}
        <div className="space-y-1 px-3 py-4">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-3 font-sans px-3 py-2 text-sm text-muted-gray hover:bg-secondary hover:text-charcoal"
          >
            <ArrowLeft className="size-4" />
            Back to Voting
          </Link>
          <button
            onClick={() => {
              signOut();
              onClose();
            }}
            className="flex w-full items-center gap-3 font-sans cursor-pointer px-3 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            <LogOut className="size-4" />
            Sign Out
          </button>
        </div>

        {/* User info */}
        {userProfile && (
          <div className="border-t border-border px-4 py-3 font-sans">
            <p className="truncate text-sm font-medium">{userProfile.fullName}</p>
            <p className="truncate text-xs text-muted-gray">
              {role === "super_admin" ? "Super Admin" : "Dept Admin"} &middot;{" "}
              {userProfile.department}
            </p>
          </div>
        )}
      </aside>
    </>
  );
};
