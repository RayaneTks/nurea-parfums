"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { nureaAdminThumbLoader } from "@/lib/image/cappedImageLoader";
import { cn } from "@/lib/utils";
import type { AdminBrandRow } from "../types";

function BrandThumb({ name, src }: { name: string; src: string }) {
  const [broken, setBroken] = useState(false);

  if (!src || broken) {
    return (
      <span
        aria-hidden
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-[var(--admin-surface-muted)] text-[15px] font-bold text-[var(--admin-text-muted)]"
      >
        {name[0]?.toUpperCase() ?? "?"}
      </span>
    );
  }

  return (
    <span
      className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[10px] bg-[var(--admin-surface)]"
      style={{ border: "1px solid var(--admin-border)" }}
    >
      <Image
        loader={nureaAdminThumbLoader}
        src={src}
        alt=""
        width={44}
        height={44}
        sizes="44px"
        quality={60}
        fetchPriority="low"
        className="h-full w-full object-cover"
        onError={() => setBroken(true)}
      />
    </span>
  );
}

export function BrandListRow({ brand }: { brand: AdminBrandRow }) {
  const isComplete = brand.catalogMode === "COMPLETE";
  const published = brand.status === "PUBLISHED";
  const count = brand._count.perfumes;

  return (
    <Link
      href={`/admin/brands/${brand.id}/edit`}
      prefetch={false}
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-[14px] bg-[var(--admin-surface)] p-2 admin-card-press",
        "shadow-[var(--admin-shadow-sm)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--admin-accent-ring)]",
      )}
      style={{ border: "1px solid var(--admin-border)" }}
    >
      <BrandThumb name={brand.name} src={(brand.imageLight || brand.image || "").trim()} />

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-[15px] font-semibold leading-tight",
            published ? "text-[var(--admin-text)]" : "text-[var(--admin-text-muted)]",
          )}
        >
          {brand.name}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5">
          <span className="truncate text-[12px] text-[var(--admin-text-subtle)]">
            {isComplete
              ? "Gamme complète"
              : `${count} parfum${count !== 1 ? "s" : ""} en sélection`}
          </span>
          {!published ? (
            <span className="shrink-0 rounded-full bg-[var(--admin-surface-muted)] px-1.5 py-px text-[10px] font-bold uppercase tracking-[0.03em] text-[var(--admin-text-muted)]">
              Masquée
            </span>
          ) : null}
        </span>
      </span>

      <ChevronRight
        size={18}
        className="shrink-0 text-[var(--admin-text-subtle)]"
        aria-hidden
      />
    </Link>
  );
}
