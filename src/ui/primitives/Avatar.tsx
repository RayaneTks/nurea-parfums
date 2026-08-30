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

/**
 * Teinte déterministe tirée du nom : deux fiches voisines restent
 * distinguables d'un coup d'œil dans une longue liste.
 *
 * La palette se limite aux jetons sémantiques du thème (bordeaux, cuivre,
 * vert, bleu ardoise). L'ancienne version tirait aussi un violet et un cyan
 * étrangers à la charte, qui trahissaient tout de suite le hasard.
 */
function colorFromName(name: string): { bg: string; fg: string } {
  const palette = [
    { bg: "var(--admin-accent-bg)", fg: "var(--admin-accent)" },
    { bg: "var(--admin-cuivre-subtle)", fg: "var(--admin-cuivre)" },
    { bg: "var(--admin-success-bg)", fg: "var(--admin-success)" },
    { bg: "var(--admin-info-bg)", fg: "var(--admin-info)" },
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
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
