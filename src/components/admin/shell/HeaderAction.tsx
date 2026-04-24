"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type BaseProps = {
  icon?: LucideIcon;
  label: string;
  children?: ReactNode;
  className?: string;
  tone?: "default" | "accent" | "danger";
};

type ButtonProps = BaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type LinkProps = BaseProps & {
  href: string;
  target?: string;
  rel?: string;
  onClick?: never;
};

type HeaderActionProps = ButtonProps | LinkProps;

const toneClasses: Record<"default" | "accent" | "danger", string> = {
  default:
    "text-admin-muted bg-admin-surface border-admin-border [@media(hover:hover)]:hover:bg-admin-surface-muted [@media(hover:hover)]:hover:text-admin-text [@media(hover:hover)]:hover:border-admin-border-hover",
  accent:
    "text-admin-accent bg-admin-accent-subtle border-admin-border-hover [@media(hover:hover)]:hover:bg-admin-accent [@media(hover:hover)]:hover:text-white",
  danger:
    "text-admin-danger bg-[var(--admin-danger-subtle)] border-[var(--admin-danger-border)] [@media(hover:hover)]:hover:bg-admin-danger [@media(hover:hover)]:hover:text-white",
};

export function HeaderAction(props: HeaderActionProps) {
  const { icon: Icon, label, children, className, tone = "default" } = props;
  const content = children ?? (Icon ? <Icon className="h-[18px] w-[18px]" aria-hidden /> : null);
  const classes = cn(
    "inline-flex h-11 w-11 items-center justify-center rounded-xl border shadow-admin-sm",
    "transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out-expo tap-scale",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2 focus-visible:ring-offset-admin-bg",
    toneClasses[tone],
    className,
  );

  if ("href" in props && props.href) {
    const { href, target, rel } = props;
    return (
      <Link href={href} target={target} rel={rel} aria-label={label} className={classes}>
        {content}
      </Link>
    );
  }

  const { icon: _i, label: _l, children: _c, className: _cn, tone: _t, href: _h, ...buttonProps } = props as ButtonProps;
  return (
    <button type="button" aria-label={label} className={classes} {...buttonProps}>
      {content}
    </button>
  );
}
