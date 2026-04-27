"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type BaseProps = {
  icon: LucideIcon;
  label: string;
  className?: string;
  children?: ReactNode;
};

type ButtonProps = BaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type LinkProps = BaseProps & {
  href: string;
};

type FABProps = ButtonProps | LinkProps;

const classes = cn(
  "flex h-14 w-14 items-center justify-center rounded-full",
  "bg-admin-accent text-white border border-admin-accent",
  "shadow-admin-lg",
  "transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out-expo tap-scale",
  "[@media(hover:hover)]:hover:bg-admin-accent-hover [@media(hover:hover)]:hover:border-admin-accent-hover [@media(hover:hover)]:hover:shadow-admin-xl [@media(hover:hover)]:hover:translate-y-[-1px]",
  "pointer-events-auto",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2 focus-visible:ring-offset-admin-bg",
);

const wrapperClasses = cn(
  "fixed left-1/2 z-[55] w-full max-w-[430px] -translate-x-1/2 px-5",
  /* Au-dessus de la tab bar (+ marge) — aligné sur --admin-bottom-nav-scroll-pad (globals.css) */
  "bottom-[calc(var(--admin-bottom-nav-scroll-pad)+12px)]",
  "flex justify-end pointer-events-none",
);

export function FAB(props: FABProps) {
  const { icon: Icon, label, className, children } = props;
  const body = children ?? <Icon className="h-6 w-6" aria-hidden strokeWidth={2.2} />;

  if ("href" in props && props.href) {
    return (
      <div className={wrapperClasses}>
        <Link
          href={props.href}
          prefetch
          aria-label={label}
          className={cn(classes, className)}
        >
          {body}
        </Link>
      </div>
    );
  }

  const { icon: _i, label: _l, className: _c, children: _ch, href: _h, ...buttonProps } =
    props as ButtonProps;
  return (
    <div className={wrapperClasses}>
      <button
        type="button"
        aria-label={label}
        className={cn(classes, className)}
        {...buttonProps}
      >
        {body}
      </button>
    </div>
  );
}
