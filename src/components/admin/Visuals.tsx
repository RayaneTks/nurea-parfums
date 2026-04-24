"use client";

import Image from "next/image";
import { SunMoon } from "lucide-react";

export function StatusDot({ status }: { status: string }) {
  const isPublished = status === "PUBLISHED";
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 ${
        isPublished ? "bg-[#2D6A4F]" : "bg-[#B8860B]"
      }`}
      aria-hidden
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
      <Image src={image} alt="" fill className="object-cover" sizes={`${size}px`} />
      {imageLight && (
        <div className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center border border-[rgba(0,0,0,0.12)] bg-[rgba(26,18,21,0.55)] text-[#FDFCFA]/90 backdrop-blur-sm">
          <SunMoon className="h-2.5 w-2.5" aria-hidden />
        </div>
      )}
    </>
  ) : (
    <div className="flex h-full w-full items-center justify-center text-[12px] font-bold uppercase tracking-wider text-[var(--admin-muted)]">
      {name.slice(0, 2)}
    </div>
  );

  return (
    <div
      className={`relative shrink-0 overflow-hidden border border-[var(--admin-border)] bg-[var(--admin-elevated)] shadow-inner transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        onClick ? "cursor-pointer active:scale-[0.98]" : ""
      }`}
      style={{ width: size, height: size }}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {content}
    </div>
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

  return (
    <div
      className={`relative shrink-0 overflow-hidden border border-[var(--admin-border)] bg-[var(--admin-elevated)] shadow-sm transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] select-none touch-manipulation ${
        onClick ? "cursor-pointer active:scale-[0.98] active:border-[var(--admin-accent)]" : ""
      } ${isLarge ? "mx-auto h-[320px] w-full max-w-[240px]" : "h-16 w-12"}`}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <Image
        src={image}
        alt={name}
        fill
        className="object-cover"
        sizes={isLarge ? "240px" : "48px"}
        priority={isLarge}
      />
      {imageLight && (
        <div className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center border border-[rgba(0,0,0,0.12)] bg-[rgba(26,18,21,0.55)] text-[#FDFCFA]/90 backdrop-blur-sm">
          <SunMoon className="h-2.5 w-2.5" aria-hidden />
        </div>
      )}
    </div>
  );
}
