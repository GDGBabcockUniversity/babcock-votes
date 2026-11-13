"use client";
import React from "react";
import Image, { ImageProps } from "next/image";
import { useImageLoad } from "@/hooks/useImageLoaded";

export interface SafeImageProps extends Omit<ImageProps, "src"> {
  src?: string | null;
  fallback?: React.ReactNode;
  delayMs?: number;
}

export const SafeImage: React.FC<SafeImageProps> = ({ fallback, delayMs, alt = "", src, ...props }) => {
  const { status } = useImageLoad({ src, delayMs });

  return src && status === "loaded" ? <Image alt={alt} src={src} {...props} /> : status === "fallback" ? <>{fallback}</> : null;
};

export default SafeImage;
