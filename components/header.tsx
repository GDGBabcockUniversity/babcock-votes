"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/auth-context";

export const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { firebaseUser, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <Link href="/" className="font-sans text-sm font-bold tracking-widest uppercase">
          Babcock Votes
        </Link>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {menuOpen && (
        <nav className="border-t border-border bg-white">
          <div className="mx-auto flex max-w-2xl flex-col gap-1 px-4 py-3">
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="rounded-md px-3 py-2 text-sm hover:bg-secondary"
            >
              Home
            </Link>
            <Link
              href="/elections"
              onClick={() => setMenuOpen(false)}
              className="rounded-md px-3 py-2 text-sm hover:bg-secondary"
            >
              Elections
            </Link>
            {firebaseUser && (
              <button
                onClick={() => {
                  signOut();
                  setMenuOpen(false);
                }}
                className="rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
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
