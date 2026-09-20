"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { AdminSidebar } from "@/components/admin-sidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { PAGES } from "@/lib/constants";
import { ThemeToggle } from "@/components/theme-toggle";

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const { authUser, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!authUser) {
        router.replace(PAGES.auth.login);
      } else if (
        userProfile &&
        userProfile.role !== "super_admin" &&
        userProfile.role !== "dept_admin"
      ) {
        router.replace(PAGES.main.home);
      }
    }
  }, [authUser, userProfile, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (
    !authUser ||
    !userProfile ||
    (userProfile.role !== "super_admin" && userProfile.role !== "dept_admin")
  ) {
    return null;
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b border-border px-4 md:hidden">
          <SidebarTrigger />
          <span className="font-sans text-sm font-bold uppercase tracking-widest">
            Admin
          </span>
          <ThemeToggle className="ml-auto" />
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AdminLayout;
