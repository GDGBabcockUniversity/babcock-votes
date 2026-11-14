"use client";
import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { PAGES } from "@/lib/constants";
import { toggleSidebar } from "@/context/app-store";
import Sidebar from "@/components/common/sidebar/Sidebar";
import "@/styles/common/sidebar/Sidebar.css";
import "@/styles/common/Shell.css";

const isViewerPath = (pathname: string) => pathname === PAGES.admin.liveResults || /^\/admin\/elections\/[^/]+\/results$/.test(pathname);

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authUser, userProfile, loading, needsEmailConfirmation } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const role = userProfile?.role;
  const isAdmin = role === "super_admin" || role === "dept_admin";
  const isViewer = role === "viewer";
  const allowed = isAdmin || (isViewer && isViewerPath(pathname));
  const isBlocked = !loading && (!authUser || !userProfile || needsEmailConfirmation || !allowed);

  useEffect(() => {
    if (loading) return;
    if (!authUser) router.replace(PAGES.auth.login);
    else if (needsEmailConfirmation) router.replace(PAGES.auth.register);
    else if (userProfile && !allowed) router.replace(isViewer ? PAGES.admin.liveResults : PAGES.main.home);
  }, [authUser, userProfile, loading, needsEmailConfirmation, router, allowed, isViewer]);
  useEffect(() => { window.innerWidth < 768 && toggleSidebar(false); }, [pathname]);

  return (
    <div className="shell-container flex h-dvh overflow-hidden">
      <Sidebar variant="admin" />
      <div className="shell-main flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        <header className="shell-mobile-header hidden max-md:flex items-center justify-between shrink-0">
          <button type="button" onClick={() => toggleSidebar(true)} className="shell-menu-btn" aria-label="Open menu">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <line x1="3" y1="5" x2="17" y2="5" />
              <line x1="3" y1="10" x2="17" y2="10" />
              <line x1="3" y1="15" x2="17" y2="15" />
            </svg>
          </button>
          <span className="shell-mobile-title">Babcock Votes Admin</span>
          <div className="shell-mobile-spacer" aria-hidden="true" />
        </header>
        <main className="shell-content flex flex-col flex-1 overflow-y-auto min-h-0">
          {isBlocked ? null : children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
