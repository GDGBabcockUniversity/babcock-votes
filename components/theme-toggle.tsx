"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export const THEME_STORAGE_KEY = "theme";

export const toggleTheme = () => {
  const isDark = document.documentElement.classList.toggle("dark");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
  } catch {
    // Storage can be unavailable (private mode); the toggle still applies for this session.
  }
};

// Both icons are always rendered and swapped with CSS, so server and client
// markup match regardless of the theme chosen before hydration.
export const ThemeToggle = ({ className }: { className?: string }) => (
  <button
    type="button"
    onClick={toggleTheme}
    aria-label="Toggle dark mode"
    className={cn(
      "cursor-pointer text-muted-gray transition-colors hover:text-foreground",
      className,
    )}
  >
    <Sun className="hidden size-4 dark:block" />
    <Moon className="size-4 dark:hidden" />
  </button>
);
