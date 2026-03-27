"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { PAGES } from "@/lib/constants";

export const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { firebaseUser, userProfile, signOut } = useAuth();
  const isAdmin =
    userProfile?.role === "super_admin" ||
    userProfile?.role === "dept_admin";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link
          href={PAGES.main.home}
          className="font-sans text-sm font-bold uppercase tracking-widest"
        >
          Babcock Votes
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href={PAGES.main.home}
            className="font-sans text-sm text-muted-gray transition-colors hover:text-charcoal"
          >
            Home
          </Link>
          <Link
            href={PAGES.main.elections}
            className="font-sans text-sm text-muted-gray transition-colors hover:text-charcoal"
          >
            Elections
          </Link>
          {isAdmin && (
            <Link
              href={PAGES.admin.dashboard}
              className="font-sans text-sm text-muted-gray transition-colors hover:text-charcoal"
            >
              Admin
            </Link>
          )}
          {firebaseUser && (
            <button
              onClick={signOut}
              className="cursor-pointer font-sans text-sm text-red-600 transition-colors hover:text-red-700"
            >
              Sign Out
            </button>
          )}
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          className="md:hidden"
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <nav className="border-t border-border bg-white font-sans md:hidden">
          <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-3">
            <Link
              href={PAGES.main.home}
              onClick={() => setMenuOpen(false)}
              className="px-3 py-2 text-sm hover:bg-secondary"
            >
              Home
            </Link>
            <Link
              href={PAGES.main.elections}
              onClick={() => setMenuOpen(false)}
              className="px-3 py-2 text-sm hover:bg-secondary"
            >
              Elections
            </Link>
            {isAdmin && (
              <Link
                href={PAGES.admin.dashboard}
                onClick={() => setMenuOpen(false)}
                className="px-3 py-2 text-sm hover:bg-secondary"
              >
                Admin
              </Link>
            )}
            {firebaseUser && (
              <button
                onClick={() => {
                  signOut();
                  setMenuOpen(false);
                }}
                className="px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
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
