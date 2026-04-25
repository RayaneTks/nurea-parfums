"use client";

import Image from "next/image";
import { SunMoon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatusDot({ status }: { status: string }) {
  const isPublished = status === "PUBLISHED";
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block h-1.5 w-1.5 rounded-full",
        isPublished ? "bg-[var(--admin-success)]" : "bg-[var(--admin-warning)]",
      )}
    />
  );
}

export function BrandVisual({
  name,
  image,
  imageLight,
  size = 64,
  onClick,
}: {
  name: string;
  image: string | null;
  imageLight?: string | null;
  size?: number;
  onClick?: () => void;
}) {
  const content = image?.trim() ? (
    <>
      <Image src={image} alt={name} fill className="object-cover" sizes={`${size}px`} />
      {imageLight ? (
        <div className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-admin-bg/70 backdrop-blur-md border border-admin-border text-admin-text">
          <SunMoon className="h-2.5 w-2.5" aria-hidden />
        </div>
      ) : null}
    </>
  ) : (
    <div className="flex h-full w-full items-center justify-center font-serif text-[14px] uppercase tracking-wider text-admin-subtle">
      {name.slice(0, 2)}
    </div>
  );

  const Component = onClick ? "button" : "div";

  return (
    <Component
      type={onClick ? "button" : undefined}
      className={cn(
        "relative shrink-0 rounded-xl overflow-hidden bg-admin-surface border border-admin-border",
        "transition-transform duration-100 ease-out-expo",
        onClick && "cursor-pointer tap-scale",
      )}
      style={{ width: size, height: size }}
      onClick={onClick}
      aria-label={onClick ? `Aperçu ${name}` : undefined}
    >
      {content}
    </Component>
  );
}

export function PerfumeVisual({
  name,
  image,
  imageLight,
  size = "md",
  onClick,
}: {
  name: string;
  image: string;
  imageLight?: string | null;
  size?: "md" | "lg";
  onClick?: () => void;
}) {
  const isLarge = size === "lg";
  const Component = onClick ? "button" : "div";

  return (
    <Component
      type={onClick ? "button" : undefined}
      className={cn(
        "relative shrink-0 rounded-xl overflow-hidden bg-admin-surface border border-admin-border",
        "transition-[border-color,transform] duration-100 ease-out-expo select-none touch-manipulation",
        onClick && "cursor-pointer tap-scale",
        isLarge ? "h-[320px] w-full max-w-[240px] mx-auto" : "h-[64px] w-[48px]",
      )}
      onClick={onClick}
      aria-label={onClick ? `Aperçu ${name}` : undefined}
    >
      <Image
        src={image}
        alt={name}
        fill
        className="object-cover"
        sizes={isLarge ? "240px" : "48px"}
        priority={isLarge}
      />
      {imageLight ? (
        <div className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-admin-bg/70 backdrop-blur-md border border-admin-border text-admin-text">
          <SunMoon className="h-2.5 w-2.5" aria-hidden />
        </div>
      ) : null}
    </Component>
  );
}
