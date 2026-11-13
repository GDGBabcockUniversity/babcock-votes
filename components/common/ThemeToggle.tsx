"use client";
import React from "react";
import clsx from "clsx";
import SunIcon from "@icons/common/sun.svg";
import MoonIcon from "@icons/common/moon.svg";
import { toggleTheme } from "@/context/app-store";
import { formatKeyTooltip, parseForARIAKS } from "sia-reactor/utils";
import { KEY_SHORTCUTS } from "./KeyHandler";
import "@/styles/common/ThemeToggle.css";

export interface ThemeToggleProps {
  className?: string;
  collapsed?: boolean;
}

export const toggle = (e: React.MouseEvent, val?: Parameters<typeof toggleTheme>[0]) => (e.stopPropagation(), toggleTheme(val));

export const ThemeToggle = React.memo(({ className, collapsed }: ThemeToggleProps): React.JSX.Element => {
  return collapsed ? (
    <button type="button" onClick={toggle} className={clsx("theme-toggle-single shrink-0", className)} aria-label="Toggle theme" title={`Toggle theme${formatKeyTooltip(KEY_SHORTCUTS.toggleTheme)}`} aria-keyshortcuts={parseForARIAKS(KEY_SHORTCUTS.toggleTheme)}>
      <span className="flex items-center justify-center relative shrink-0">
        <SunIcon className="theme-toggle-icon theme-icon-sun" aria-hidden />
        <MoonIcon className="theme-toggle-icon theme-icon-moon" aria-hidden />
      </span>
    </button>
  ) : (
    <div className={clsx("theme-toggle flex items-center gap-0.5", className)} role="group" aria-label="Theme toggle" onClick={(e) => toggle(e, "auto")}>
      <button type="button" onClick={(e) => toggle(e, "light")} className="theme-toggle-btn theme-btn-light" aria-label="Switch to light mode" title={`Switch to light mode${formatKeyTooltip(KEY_SHORTCUTS.toggleTheme)}`} aria-keyshortcuts={parseForARIAKS(KEY_SHORTCUTS.toggleTheme)}>
        <SunIcon className="theme-toggle-icon theme-icon-sun" aria-hidden />
      </button>
      <button type="button" onClick={(e) => toggle(e, "dark")} className="theme-toggle-btn theme-btn-dark" aria-label="Switch to dark mode" title={`Switch to dark mode${formatKeyTooltip(KEY_SHORTCUTS.toggleTheme)}`} aria-keyshortcuts={parseForARIAKS(KEY_SHORTCUTS.toggleTheme)}>
        <MoonIcon className="theme-toggle-icon theme-icon-moon" aria-hidden />
      </button>
    </div>
  );
});

ThemeToggle.displayName = "ThemeToggle";

export default ThemeToggle;
