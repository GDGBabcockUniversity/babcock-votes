import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { DEPARTMENTS } from "./constants";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export { matricToDocId } from "./matric";

export const getDepartmentName = (id: string) => {
  return DEPARTMENTS.find((d) => d.id === id)?.name || id;
};

export const getDepartmentId = (name: string) => {
  return DEPARTMENTS.find((d) => d.name.toLowerCase() === name.toLowerCase())?.id || name;
};

export function getInitials(name?: string): string {
  if (!name) return "BV";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getClosestScrollableContainer(el: HTMLElement | null, mustBeScrollable = false): HTMLElement | null {
  let node = el;
  while (node && node !== document.documentElement) {
    const { overflowX, overflowY } = getComputedStyle(node);
    const isScrollableX = /(auto|scroll|overlay)/.test(overflowX) && (!mustBeScrollable || node.scrollWidth > node.clientWidth),
      isScrollableY = /(auto|scroll|overlay)/.test(overflowY) && (!mustBeScrollable || node.scrollHeight > node.clientHeight);
    if (isScrollableY || isScrollableX) return node;
    node = node.parentElement;
  }
  return document.scrollingElement as HTMLElement;
}

export function radialSweep(fn: () => void, origin: Event | React.MouseEvent | HTMLElement | Record<"x" | "y", number> = { x: 0, y: 0 }, duration = 750, reverse = !document.documentElement.classList.contains("dark")) {
  if (typeof document === "undefined" || !document.startViewTransition || !duration) return fn();
  let x: number, y: number;
  if ("getBoundingClientRect" in origin) {
    const { left, top, width, height } = origin.getBoundingClientRect();
    ((x = left + width / 2), (y = top + height / 2));
  } else ((x = "x" in origin ? origin.x : ((origin as MouseEvent).clientX ?? 0)), (y = "y" in origin ? origin.y : ((origin as MouseEvent).clientY ?? 0)));

  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  if (reverse) document.documentElement.classList.add("reverse-sweep");
  const vt = document.startViewTransition(fn);
  vt.ready.then(() => {
    const pseudoElement = reverse ? "::view-transition-old(root)" : "::view-transition-new(root)",
      clipPath = reverse ? [`circle(${radius}px at ${x}px ${y}px)`, `circle(0px at ${x}px ${y}px)`] : [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`];
    const anim = document.documentElement.animate({ clipPath }, { duration, easing: "cubic-bezier(0.65, 0, 0.35, 1)", pseudoElement });
    if (reverse) setTimeout((anim.onfinish = () => document.documentElement.classList.remove("reverse-sweep")), Math.max(0, duration - 30));
  });
  vt.finished.finally(() => document.documentElement.classList.remove("reverse-sweep"));
} // Circular radial sweep view transition originating from the click/element position
