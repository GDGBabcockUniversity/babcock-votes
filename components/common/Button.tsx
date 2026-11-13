"use client";
import React from "react";
import clsx from "clsx";
import Link, { type LinkProps } from "next/link";
import { rippleHandler } from "@t007/utils/hooks/vanilla";
import "@/styles/common/Button.css";

type CustomProps = {
  className?: string;
  children?: React.ReactNode;
  variant?: "primary" | "secondary" | "stamp" | "ghost" | "regular" | "danger";
  size?: "sm" | "lg";
  curved?: boolean;
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & CustomProps;
export type ButtonLinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & LinkProps & CustomProps;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = "primary", size, curved = false, className, children, ...props }, ref) {
  return (
    <button {...props} ref={ref} type={props.type || "button"} className={clsx("button font-semibold relative overflow-hidden whitespace-nowrap select-none gap-2.5 hover:not(:disabled):opacity-90 active:not(:disabled):scale-[0.99] disabled:opacity-50", variant, size, { curved }, className)} onPointerDown={(e) => (!props.disabled && rippleHandler(e, { target: e.currentTarget }), props.onPointerDown?.(e))}>
      {children}
    </button>
  );
});

export const ButtonLink = React.forwardRef<HTMLAnchorElement, ButtonLinkProps>(function ButtonLink({ variant = "primary", size, curved = false, className, children, ...props }, ref) {
  return (
    <Link {...props} ref={ref} className={clsx("button no-underline font-semibold relative overflow-hidden whitespace-nowrap select-none gap-2.5 hover:opacity-90 active:scale-[0.99]", variant, size, { curved }, className)} onPointerDown={(e) => (rippleHandler(e, { target: e.currentTarget }), props.onPointerDown?.(e))}>
      {children}
    </Link>
  );
});

export default Button;
