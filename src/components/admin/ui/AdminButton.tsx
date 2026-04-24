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

/** Boutons style iOS : coins continus ~10pt, teinte système pour l’action principale. */
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
    "inline-flex items-center justify-center font-semibold transition-opacity duration-150 ease-out active:opacity-70 disabled:opacity-38 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-ring-offset)] select-none touch-manipulation rounded-[10px]";

  const variants = {
    primary: "bg-[var(--admin-accent-solid)] text-white",
    secondary: "bg-[var(--admin-fill)] text-[var(--admin-text)] border border-[var(--admin-border)]",
    ghost: "bg-transparent text-[var(--admin-accent)]",
    danger: "bg-transparent text-[var(--admin-danger)]",
    outline: "bg-transparent border border-[var(--admin-border)] text-[var(--admin-text)]",
  };

  const sizes = {
    sm: "min-h-[36px] px-3 text-[13px] gap-1.5",
    md: "min-h-[44px] px-4 text-[15px] gap-2",
    lg: "min-h-[50px] px-5 text-[17px] gap-2",
    icon: "h-11 w-11 min-h-[44px] min-w-[44px]",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin opacity-90" aria-hidden />
      ) : (
        <>
          {LeftIcon && <LeftIcon className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} strokeWidth={2} />}
          {children}
          {RightIcon && <RightIcon className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} strokeWidth={2} />}
        </>
      )}
    </button>
  );
}
