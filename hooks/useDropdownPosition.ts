"use client";
import { useState, useLayoutEffect, type RefObject } from "react";
import { getClosestScrollableContainer } from "@/lib/utils";

export type Position = "top-right" | "top-left" | "top-center" | "bottom-right" | "bottom-left" | "bottom-center";

export type DropdownPosition = Position;

interface Config {
  enabled?: boolean;
  fallback?: Position;
  containerSelector?: string;
}

export function useDropdownPosition(triggerRef: RefObject<HTMLElement | null>, dropdownRef: RefObject<HTMLElement | null>, { containerSelector, enabled = false, fallback = "bottom-left" }: Config = {}) {
  const [position, setPosition] = useState<Position>(fallback);

  useLayoutEffect(() => {
    if (!enabled) return setPosition(fallback);
    const triggerEl = triggerRef.current,
      dropdownEl = dropdownRef.current,
      containerEl = (containerSelector ? (document.querySelector(containerSelector) as HTMLElement) : null) ?? getClosestScrollableContainer(triggerEl) ?? document.documentElement;
    if (!triggerEl || !dropdownEl) return;

    const recalc = () => {
      const triggerRect = triggerEl.getBoundingClientRect();
      const dropdownRect = dropdownEl.getBoundingClientRect();
      const boundaryRect = containerEl.getBoundingClientRect();
      const spaceBelow = boundaryRect.bottom - triggerRect.bottom;
      const spaceAbove = triggerRect.top - boundaryRect.top;

      const fitsBottom = spaceBelow >= dropdownRect.height || spaceBelow > spaceAbove;
      const fitsLeft = triggerRect.right - boundaryRect.left >= dropdownRect.width;
      const fitsRight = boundaryRect.right - triggerRect.left >= dropdownRect.width;

      const [prefV, prefH] = fallback.split("-") as ["top" | "bottom", "left" | "right" | "center"];
      const vertical = prefV === "top" ? (spaceAbove >= dropdownRect.height ? "top" : "bottom") : fitsBottom ? "bottom" : "top";
      const horizontal = prefH === "left" && fitsLeft ? "left" : prefH === "right" && fitsRight ? "right" : prefH === "center" && fitsLeft && fitsRight ? "center" : fitsLeft && fitsRight ? "center" : fitsLeft ? "left" : "right";

      const resolved: Position = `${vertical}-${horizontal}`;
      (setPosition(resolved), dropdownEl.style.setProperty("--available-space", `${Math.max(vertical === "bottom" ? spaceBelow : spaceAbove, 240)}px`));
    };

    const observer = new ResizeObserver(recalc);
    (recalc(), observer.observe(containerEl), observer.observe(dropdownEl), containerEl.addEventListener("scroll", recalc, { passive: true }));

    return () => (observer.disconnect(), containerEl.removeEventListener("scroll", recalc));
  }, [triggerRef, dropdownRef, fallback, containerSelector, enabled]);

  return position;
}
