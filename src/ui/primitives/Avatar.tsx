import Image from "next/image";
import { cn } from "@/lib/utils";

type AvatarSize = "sm" | "md" | "lg" | "xl";

type AvatarProps = {
  name: string;
  src?: string | null;
  size?: AvatarSize;
  className?: string;
};

const sizePx: Record<AvatarSize, number> = {
  sm: 32,
  md: 40,
  lg: 56,
  xl: 72,
};

const sizeText: Record<AvatarSize, string> = {
  sm: "text-[12px]",
  md: "text-[14px]",
  lg: "text-[18px]",
  xl: "text-[22px]",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

function colorFromName(name: string): { bg: string; fg: string } {
  const palette = [
    { bg: "rgba(123, 11, 29, 0.12)", fg: "#7B0B1D" },
    { bg: "rgba(30, 125, 69, 0.12)", fg: "#1E7D45" },
    { bg: "rgba(163, 91, 18, 0.12)", fg: "#A35B12" },
    { bg: "rgba(62, 90, 122, 0.12)", fg: "#3E5A7A" },
    { bg: "rgba(123, 90, 165, 0.12)", fg: "#7B5AA5" },
    { bg: "rgba(36, 100, 140, 0.12)", fg: "#24648C" },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length]!;
}

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const px = sizePx[size];
  if (src) {
    return (
      <span
        className={cn(
          "relative inline-block shrink-0 overflow-hidden rounded-full",
          className,
        )}
        style={{ width: px, height: px }}
      >
        <Image src={src} alt={name} fill sizes={`${px}px`} className="object-cover" />
      </span>
    );
  }
  const { bg, fg } = colorFromName(name);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        sizeText[size],
        className,
      )}
      style={{ width: px, height: px, background: bg, color: fg }}
      aria-label={name}
    >
      {initials(name)}
    </span>
  );
}
