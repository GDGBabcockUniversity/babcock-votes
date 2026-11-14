import { useState, useEffect } from "react";

type ImageStatus = "loading" | "loaded" | "fallback";

export interface UseImageLoadProps {
  src?: string | null;
  delayMs?: number;
}

export function useImageLoad({ src = "", delayMs = 1000 }: UseImageLoadProps = {}) {
  const [status, setStatus] = useState<ImageStatus>(src ? "loading" : "fallback");

  useEffect(() => {
    if (!src) return setStatus("fallback");
    setStatus("loading");
    const timer = setTimeout(() => setStatus((s) => (s === "loaded" ? s : "fallback")), delayMs);
    const img = new window.Image();
    img.src = src;
    if (img.complete) (clearTimeout(timer), setStatus(img.naturalWidth > 0 ? "loaded" : "fallback"));
    img.onload = () => (clearTimeout(timer), setStatus(img.naturalWidth > 0 ? "loaded" : "fallback")); // "loaded"
    img.onerror = () => (clearTimeout(timer), setStatus("fallback"));

    return () => clearTimeout(timer);
  }, [src, delayMs]);

  return { status };
}
