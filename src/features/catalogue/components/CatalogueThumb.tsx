"use client";

import Image from "next/image";
import { useState } from "react";
import { nureaAdminThumbLoader } from "@/lib/image/cappedImageLoader";
import { cn } from "@/lib/utils";

type CatalogueThumbProps = {
  src: string | null;
  /** Initiale affichée sans visuel (ou visuel cassé). */
  name: string;
  /** Côté en px (défaut 44). */
  size?: 40 | 44 | 56;
  /** Atténuée : parfum ou marque masqués. */
  muted?: boolean;
};

const sizeClass = { 40: "h-10 w-10", 44: "h-11 w-11", 56: "h-14 w-14" } as const;

/**
 * Vignette de liste (06 E15) : image CONTENUE — un logo garde ses proportions, un flacon n'est pas rogné —
 * plafonnée à 256 px par le chargeur d'images de la gestion (04 §15, NR-5.17), basse priorité.
 */
export function CatalogueThumb({ src, name, size = 44, muted = false }: CatalogueThumbProps) {
  const [broken, setBroken] = useState(false);
  const url = (src ?? "").trim();
  return (
    <span
      aria-hidden
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-[var(--admin-radius-sm)]",
        "border border-[var(--admin-border)] bg-[var(--admin-surface-muted)]",
        sizeClass[size],
        muted ? "opacity-60" : null,
      )}
    >
      {url && !broken ? (
        <Image
          loader={nureaAdminThumbLoader}
          src={url}
          alt=""
          width={size}
          height={size}
          sizes={`${size}px`}
          quality={60}
          fetchPriority="low"
          className="h-full w-full object-contain p-0.5"
          onError={() => setBroken(true)}
        />
      ) : (
        <span className="admin-type-body-em text-[var(--admin-text-subtle)]">{name.trim().charAt(0).toUpperCase() || "?"}</span>
      )}
    </span>
  );
}
