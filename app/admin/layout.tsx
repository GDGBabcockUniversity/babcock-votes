"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { AdminSidebar } from "@/components/admin-sidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { PAGES } from "@/lib/constants";
import { ThemeToggle } from "@/components/theme-toggle";

/** Viewers may only open the live-results list and an election's results page. */
const isViewerPath = (pathname: string) =>
  pathname === PAGES.admin.liveResults ||
  /^\/admin\/elections\/[^/]+\/results$/.test(pathname);

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const { authUser, userProfile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const role = userProfile?.role;
  const isAdmin = role === "super_admin" || role === "dept_admin";
  const isViewer = role === "viewer";
  const allowed = isAdmin || (isViewer && isViewerPath(pathname));

  useEffect(() => {
    if (!loading) {
      if (!authUser) {
        router.replace(PAGES.auth.login);
      } else if (userProfile && !allowed) {
        router.replace(isViewer ? PAGES.admin.liveResults : PAGES.main.home);
      }
    }
  }, [authUser, userProfile, loading, router, allowed, isViewer]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (!authUser || !userProfile || !allowed) {
    return null;
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b border-border px-4 md:hidden">
          <SidebarTrigger />
          <span className="font-sans text-sm font-bold uppercase tracking-widest">
            {isViewer ? "Live Results" : "Admin"}
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
