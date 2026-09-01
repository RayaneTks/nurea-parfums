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

/*
 * La pastille est NEUTRE, et ce n'est pas un oubli.
 *
 * Elle tirait sa teinte d'un hachage du nom, dans une palette qui contenait le
 * vert « encaissé » et le bordeaux d'accent. Un client pouvait donc porter un
 * rond vert juste à côté d'un montant ambre « à encaisser » : deux couleurs
 * qui veulent dire quelque chose, dont l'une ne voulait rien dire.
 *
 * Dans cette app, le vert, l'ambre et le rouge parlent d'argent. Les leur
 * emprunter pour décorer, c'est les vider de leur sens partout ailleurs. Les
 * initiales suffisent à distinguer deux voisins dans une liste.
 */
const PASTILLE = { bg: "var(--admin-surface-muted)", fg: "var(--admin-text-muted)" } as const;

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
  const { bg, fg } = PASTILLE;
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
