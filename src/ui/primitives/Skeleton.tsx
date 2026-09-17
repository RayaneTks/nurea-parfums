import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

type SkeletonShape = "line" | "block" | "circle";

type SkeletonProps = {
  shape?: SkeletonShape;
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: CSSProperties;
};

/**
 * Chargement : un squelette aux proportions EXACTES du contenu final — rien ne
 * se déplace à l'arrivée des données (05 §5.1). Un spinner seul est interdit
 * hors `Button isLoading`.
 */
export function Skeleton({ shape = "line", width, height, className, style }: SkeletonProps) {
  const isCircle = shape === "circle";
  return (
    <span
      aria-hidden
      className={cn(
        "admin-skeleton block",
        isCircle ? "rounded-[var(--admin-radius-full)]" : "rounded-[var(--admin-radius-sm)]",
        className,
      )}
      style={{
        width: width ?? "100%",
        height: height ?? (shape === "line" ? "1em" : isCircle ? width : "100%"),
        ...style,
      }}
    />
  );
}

/** Squelette d'une `ListRow` avec avatar : 56 px, deux lignes, un montant. */
export function SkeletonRow({ avatar = true, trailing = true }: { avatar?: boolean; trailing?: boolean }) {
  return (
    <div className="flex min-h-[56px] items-center gap-3 px-3 py-2">
      {avatar ? <Skeleton shape="circle" width={40} height={40} /> : null}
      {/* Boîtes de ligne du texte réel : body 15 × 1,4 puis caption 13 × 1,4 (+ 2 px). */}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex h-[21px] items-center">
          <Skeleton width="60%" height={14} />
        </span>
        <span className="mt-0.5 flex h-[18px] items-center">
          <Skeleton width="40%" height={12} />
        </span>
      </div>
      {trailing ? <Skeleton width={56} height={15} /> : null}
    </div>
  );
}

/** Squelette d'une `ListSection` : une carte bord à bord, rangées séparées d'un filet. */
export function SkeletonList({ count = 5, avatar = true }: { count?: number; avatar?: boolean }) {
  return (
    <div
      aria-busy
      className="overflow-hidden rounded-[var(--admin-radius-lg)] border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[shadow:var(--admin-shadow-sm)]"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={i > 0 ? "border-t border-[var(--admin-border)]" : undefined}>
          <SkeletonRow avatar={avatar} />
        </div>
      ))}
    </div>
  );
}
