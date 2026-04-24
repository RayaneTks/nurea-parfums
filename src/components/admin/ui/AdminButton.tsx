"use client";

import { Loader2, LucideIcon } from "lucide-react";
import { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface AdminButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  children?: ReactNode;
}

export function AdminButton({
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  children,
  className = "",
  disabled,
  ...props
}: AdminButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.96] disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-surface)] select-none touch-manipulation";

  const variants = {
    primary:
      "bg-[var(--admin-accent-solid)] text-[#FDFCFA] hover:bg-[var(--admin-accent)] shadow-sm",
    secondary:
      "bg-[var(--admin-elevated)] text-[var(--admin-text)] border border-[var(--admin-border)] hover:bg-[#EDE8E3]",
    ghost: "bg-transparent text-[var(--admin-muted)] hover:bg-[var(--admin-elevated)] hover:text-[var(--admin-text)]",
    danger:
      "bg-transparent text-[var(--admin-danger)] border border-[rgba(163,48,48,0.35)] hover:bg-[rgba(163,48,48,0.08)]",
    outline:
      "bg-transparent border border-[var(--admin-border)] text-[var(--admin-text)] hover:border-[var(--admin-accent)]",
  };

  const sizes = {
    sm: "min-h-[36px] px-3 text-xs gap-1.5",
    md: "min-h-[44px] px-4 text-sm gap-2",
    lg: "min-h-[52px] px-6 text-[15px] gap-2.5",
    icon: "h-11 w-11 min-h-[44px] min-w-[44px]",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          {LeftIcon && <LeftIcon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />}
          {children}
          {RightIcon && <RightIcon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />}
        </>
      )}
    </button>
  );
}
