"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
  leading?: ReactNode;
  className?: string;
  sticky?: boolean;
  /** Affiche le monogramme cuivre signature en filigrane discret. Activé par défaut sur les landings. */
  signature?: boolean;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  action,
  leading,
  className,
  sticky = true,
  signature = false,
}: PageHeaderProps) {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsCompact(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "z-40 border-b border-admin-border admin-header-blur transition-[border-color,background-color,backdrop-filter] duration-200 ease-out-expo",
        sticky && "sticky top-0",
        className,
      )}
    >
      <div
        className={cn(
          "relative flex items-start gap-3 px-5 pb-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] transition-[padding] duration-200 ease-out-expo",
          isCompact && "pb-3 pt-[calc(env(safe-area-inset-top,0px)+0.65rem)]",
        )}
      >
        {leading ? <div className="shrink-0 pt-1.5">{leading}</div> : null}
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="text-[11px] font-medium uppercase tracking-wider text-admin-muted mb-1">
              {eyebrow}
            </p>
          ) : null}
          <h1
            className={cn(
              "font-sans font-bold leading-[1.1] tracking-tight text-admin-text transition-[font-size] duration-200 ease-out-expo",
              isCompact ? "text-[24px]" : "text-[28px]",
            )}
          >
            {title}
          </h1>
          {description ? (
            <p
              className={cn(
                "leading-snug text-admin-muted transition-[margin-top,font-size] duration-200 ease-out-expo",
                isCompact ? "mt-1 text-[13px]" : "mt-1.5 text-[14px]",
              )}
            >
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0 pt-0.5">{action}</div> : null}

        {signature ? (
          <Image
            src="/branding/monogram/np-free-cuivre.svg"
            alt=""
            aria-hidden
            width={36}
            height={36}
            className="pointer-events-none absolute right-3 bottom-3 opacity-25 select-none"
            priority={false}
          />
        ) : null}
      </div>
    </header>
  );
}
