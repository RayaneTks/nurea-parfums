"use client";

import { Loader2, type LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline" | "accent";
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface AdminButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  children?: ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-admin-accent text-white border border-admin-accent shadow-admin-sm [@media(hover:hover)]:hover:bg-admin-accent-hover [@media(hover:hover)]:hover:border-admin-accent-hover [@media(hover:hover)]:hover:shadow-admin-md",
  accent:
    "bg-admin-accent-subtle text-admin-accent border border-admin-border-hover [@media(hover:hover)]:hover:bg-admin-accent [@media(hover:hover)]:hover:text-white [@media(hover:hover)]:hover:border-admin-accent",
  secondary:
    "bg-admin-surface text-admin-text border border-admin-border shadow-admin-sm [@media(hover:hover)]:hover:bg-admin-surface-muted [@media(hover:hover)]:hover:border-admin-border-hover",
  ghost:
    "bg-transparent text-admin-muted border border-transparent [@media(hover:hover)]:hover:bg-admin-surface-muted [@media(hover:hover)]:hover:text-admin-text",
  outline:
    "bg-transparent border border-admin-border text-admin-text [@media(hover:hover)]:hover:border-admin-border-hover [@media(hover:hover)]:hover:bg-admin-surface-muted",
  danger:
    "bg-[var(--admin-danger-subtle)] text-admin-danger border border-[var(--admin-danger-border)] [@media(hover:hover)]:hover:bg-admin-danger [@media(hover:hover)]:hover:text-white [@media(hover:hover)]:hover:border-admin-danger",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-11 px-3.5 text-[13px] gap-1.5 rounded-xl",
  md: "min-h-11 px-4 text-[14px] gap-2 rounded-xl",
  lg: "min-h-[52px] px-6 text-[15px] gap-2.5 rounded-2xl",
  icon: "h-11 w-11 min-h-11 min-w-11 rounded-xl",
};

const iconSize: Record<ButtonSize, string> = {
  sm: "h-3.5 w-3.5",
  md: "h-[18px] w-[18px]",
  lg: "h-[18px] w-[18px]",
  icon: "h-[18px] w-[18px]",
};

export function AdminButton({
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  children,
  className,
  disabled,
  type,
  ...props
}: AdminButtonProps) {
  return (
    <button
      type={type ?? "button"}
      className={cn(
        "inline-flex items-center justify-center font-medium",
        "transition-transform duration-100 ease-out-expo active:scale-[0.97]",
        "transition-[background-color,border-color,color,box-shadow] duration-200 ease-out-expo",
        "admin-button-micro",
        "disabled:opacity-40 disabled:pointer-events-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2 focus-visible:ring-offset-admin-bg",
        "select-none touch-manipulation",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className={cn("animate-spin", iconSize[size])} aria-hidden />
      ) : (
        <>
          {LeftIcon ? <LeftIcon className={iconSize[size]} aria-hidden /> : null}
          {children}
          {RightIcon ? <RightIcon className={iconSize[size]} aria-hidden /> : null}
        </>
      )}
    </button>
  );
}
