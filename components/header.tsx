"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { PAGES } from "@/lib/constants";
import { ThemeToggle } from "@/components/theme-toggle";

export const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { authUser, userProfile, signOut } = useAuth();
  const isAdmin =
    userProfile?.role === "super_admin" ||
    userProfile?.role === "dept_admin";
  const isViewer = userProfile?.role === "viewer";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link
          href={PAGES.main.home}
          className="font-sans text-sm font-bold uppercase tracking-widest"
        >
          Babcock Votes
        </Link>

        <div className="flex items-center gap-4">
          {/* Desktop nav */}
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href={PAGES.main.home}
              className="font-sans text-sm text-muted-gray transition-colors hover:text-foreground"
            >
              Home
            </Link>
            <Link
              href={PAGES.main.elections}
              className="font-sans text-sm text-muted-gray transition-colors hover:text-foreground"
            >
              Elections
            </Link>
            {isAdmin && (
              <Link
                href={PAGES.admin.dashboard}
                className="font-sans text-sm text-muted-gray transition-colors hover:text-foreground"
              >
                Admin
              </Link>
            )}
            {isViewer && (
              <Link
                href={PAGES.admin.liveResults}
                className="font-sans text-sm text-muted-gray transition-colors hover:text-foreground"
              >
                Live Results
              </Link>
            )}
            {authUser && (
              <button
                onClick={signOut}
                className="cursor-pointer rounded-sm font-sans text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                Sign Out
              </button>
            )}
          </nav>

          <ThemeToggle />

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            className="cursor-pointer rounded-sm text-muted-gray hover:text-foreground md:hidden"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <nav id="mobile-nav" className="border-t border-border bg-card font-sans md:hidden">
          <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-3">
            <Link
              href={PAGES.main.home}
              onClick={() => setMenuOpen(false)}
              className="rounded-sm px-3 py-2 text-sm hover:bg-secondary"
            >
              Home
            </Link>
            <Link
              href={PAGES.main.elections}
              onClick={() => setMenuOpen(false)}
              className="rounded-sm px-3 py-2 text-sm hover:bg-secondary"
            >
              Elections
            </Link>
            {isAdmin && (
              <Link
                href={PAGES.admin.dashboard}
                onClick={() => setMenuOpen(false)}
                className="rounded-sm px-3 py-2 text-sm hover:bg-secondary"
              >
                Admin
              </Link>
            )}
            {isViewer && (
              <Link
                href={PAGES.admin.liveResults}
                onClick={() => setMenuOpen(false)}
                className="rounded-sm px-3 py-2 text-sm hover:bg-secondary"
              >
                Live Results
              </Link>
            )}
            {authUser && (
              <button
                onClick={() => {
                  signOut();
                  setMenuOpen(false);
                }}
                className="cursor-pointer rounded-sm px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                Sign Out
              </button>
            )}
          </div>
        </nav>
      )}
    </header>
  );
};
