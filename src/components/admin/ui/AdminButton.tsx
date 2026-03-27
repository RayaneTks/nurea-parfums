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
  const baseStyles = "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 active:scale-[0.96] disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 select-none touch-manipulation";
  
  const variants = {
    primary: "bg-blue-600 text-white [@media(hover:hover)]:hover:bg-blue-500 shadow-lg shadow-blue-600/20 active:bg-blue-700",
    secondary: "bg-zinc-800 text-zinc-100 [@media(hover:hover)]:hover:bg-zinc-700 active:bg-zinc-900",
    ghost: "bg-transparent text-zinc-400 [@media(hover:hover)]:hover:bg-zinc-800 [@media(hover:hover)]:hover:text-zinc-100 active:bg-zinc-800/50",
    danger: "bg-red-500/10 text-red-400 [@media(hover:hover)]:hover:bg-red-500 [@media(hover:hover)]:hover:text-white active:bg-red-600",
    outline: "bg-transparent border border-zinc-700 text-zinc-300 [@media(hover:hover)]:hover:border-zinc-500 [@media(hover:hover)]:hover:text-zinc-100 active:bg-zinc-800",
  };

  const sizes = {
    sm: "min-h-[36px] px-3 text-xs gap-1.5",
    md: "min-h-[44px] px-4 text-sm gap-2",
    lg: "min-h-[52px] px-6 text-[15px] gap-2.5",
    icon: "h-10 w-10 min-h-[44px] min-w-[44px]", // Mobile-first touch target
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
