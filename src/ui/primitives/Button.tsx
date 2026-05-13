"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "text";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  children?: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    "bg-[var(--admin-accent)] text-white",
    "hover:bg-[var(--admin-accent-hover)]",
    "active:bg-[var(--admin-accent-hover)]",
    "shadow-[var(--admin-shadow-sm)]",
  ].join(" "),
  secondary: [
    "bg-[var(--admin-surface)] text-[var(--admin-text)]",
    "border border-[var(--admin-border-strong)]",
    "hover:bg-[var(--admin-surface-alt)]",
  ].join(" "),
  ghost: [
    "bg-transparent text-[var(--admin-text)]",
    "hover:bg-[var(--admin-surface-muted)]",
  ].join(" "),
  danger: [
    "bg-[var(--admin-danger)] text-white",
    "hover:opacity-95",
  ].join(" "),
  text: [
    "bg-transparent text-[var(--admin-accent)]",
    "hover:underline underline-offset-2",
  ].join(" "),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "min-h-[36px] px-3 text-[13px] gap-1.5 rounded-[10px]",
  md: "min-h-[44px] px-4 text-[15px] gap-2 rounded-[12px]",
  lg: "min-h-[52px] px-5 text-[16px] font-semibold gap-2 rounded-[14px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    isLoading = false,
    fullWidth = false,
    leadingIcon,
    trailingIcon,
    disabled,
    children,
    className,
    type,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || isLoading;
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      className={cn(
        "inline-flex items-center justify-center font-medium",
        "transition-[background-color,color,opacity,transform] duration-[var(--admin-duration-default)] ease-[var(--admin-easing-default)]",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "tap-scale select-none",
        variantStyles[variant],
        sizeStyles[size],
        fullWidth ? "w-full" : null,
        className,
      )}
      {...rest}
    >
      {isLoading ? (
        <Loader2 size={size === "sm" ? 14 : 16} className="animate-spin" aria-hidden />
      ) : leadingIcon}
      {children ? <span className="min-w-0">{children}</span> : null}
      {!isLoading && trailingIcon}
    </button>
  );
});
