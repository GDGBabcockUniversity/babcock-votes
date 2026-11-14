"use client";
import React from "react";
import clsx from "clsx";
import SafeImage from "./SafeImage";
import { getInitials } from "@/lib/utils";
import UserIcon from "@icons/common/user.svg";
import "@/styles/common/Avatar.css";

export interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  radius?: "full" | "sm" | "md" | "lg" | "none";
  delayMs?: number;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ src, name, size = "md", radius = "full", delayMs, className }) => {
  const initials = getInitials(name);

  return (
    <span className={clsx("avatar-wrapper relative overflow-hidden flex items-center justify-center shrink-0 select-none font-bold", `size-${size}`, `radius-${radius}`, className)}>
      <SafeImage
        fill
        sizes="100%"
        alt={name ?? "User avatar"}
        src={src}
        className="avatar-img object-cover w-full h-full"
        delayMs={delayMs}
        fallback={
          name ? (
            <span className="avatar-initials leading-none">{initials}</span>
          ) : (
            <span className="avatar-icon flex items-center justify-center w-full h-full p-[22%]">
              <UserIcon className="w-full h-full" />
            </span>
          )
        }
      />
    </span>
  );
};

export default Avatar;
