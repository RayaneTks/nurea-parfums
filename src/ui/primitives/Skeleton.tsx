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

export function Skeleton({
  shape = "line",
  width,
  height,
  className,
  style,
}: SkeletonProps) {
  const isCircle = shape === "circle";
  const defaultHeight = shape === "line" ? "1em" : isCircle ? width : "100%";
  return (
    <span
      aria-hidden
      className={cn(
        "admin-skeleton block",
        isCircle ? "rounded-full" : "rounded-[8px]",
        className,
      )}
      style={{
        width: width ?? "100%",
        height: height ?? defaultHeight,
        ...style,
      }}
    />
  );
}

export function SkeletonRow() {
  return (
    <div
      className="flex items-center gap-3 rounded-[14px] border bg-[var(--admin-surface)] p-3"
      style={{ borderColor: "var(--admin-border)" }}
    >
      <Skeleton shape="circle" width={40} height={40} />
      <div className="flex-1 space-y-2">
        <Skeleton width="60%" height={14} />
        <Skeleton width="40%" height={12} />
      </div>
      <Skeleton width={56} height={14} />
    </div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}
