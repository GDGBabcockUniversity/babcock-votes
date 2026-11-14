"use client";
import { useState, useEffect } from "react";

export function useIsVisible(open: boolean, delay = 200): boolean {
  const [isVisible, setIsVisible] = useState(open);

  useEffect(() => {
    if (open) setIsVisible(true);
    else {
      const timeout = setTimeout(() => setIsVisible(false), delay);
      return () => clearTimeout(timeout);
    }
  }, [open, delay]);

  return isVisible;
}
