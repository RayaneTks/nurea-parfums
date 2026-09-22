import Image from "next/image";
import { cn } from "@/lib/utils";

type AvatarSize = "sm" | "md" | "lg" | "xl";

type AvatarProps = {
  name: string;
  src?: string | null;
  size?: AvatarSize;
  className?: string;
};

const sizePx: Record<AvatarSize, number> = { sm: 32, md: 40, lg: 56, xl: 72 };

const sizeText: Record<AvatarSize, string> = {
  sm: "admin-type-micro font-semibold",
  md: "admin-type-caption font-semibold",
  lg: "admin-type-h3",
  xl: "admin-type-h2",
};

/**
 * Initiales d'un nom : « Émilie Durand » → « ÉD », « fares » → « FA ».
 *
 * Normalisé en NFC avant de lire la première lettre : une saisie décomposée
 * (« E » + accent combinant, courante au copier-coller) donnait « E » sans son
 * accent. Seules les lettres comptent : « @snap_lina » → « SN ».
 */
export function initials(name: string): string {
  const words = name
    .normalize("NFC")
    .split(/\s+/)
    .map((w) => Array.from(w).filter((c) => /\p{L}/u.test(c)))
    .filter((letters) => letters.length > 0);
  const first = words[0];
  if (!first) return "?";
  const last = words.length > 1 ? words[words.length - 1] : undefined;
  const pair = last ? [first[0], last[0]] : first.slice(0, 2);
  return pair.join("").toLocaleUpperCase("fr-FR");
}

/*
 * La pastille est NEUTRE, et ce n'est pas un oubli : teintée par hachage du
 * nom, elle empruntait le vert « encaissé » et le bordeaux d'accent. Un client
 * portait un rond vert à côté d'un montant ambre « à encaisser » — deux
 * couleurs qui veulent dire quelque chose, dont l'une ne voulait rien dire.
 */
export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const px = sizePx[size];
  if (src) {
    return (
      <span
        className={cn("relative inline-block shrink-0 overflow-hidden rounded-[var(--admin-radius-full)]", className)}
        style={{ width: px, height: px }}
      >
        <Image src={src} alt={name} fill sizes={`${px}px`} className="object-cover" />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[var(--admin-radius-full)]",
        "bg-[var(--admin-surface-muted)] text-[var(--admin-text-muted)]",
        sizeText[size],
        className,
      )}
      style={{ width: px, height: px }}
    >
      {initials(name)}
    </span>
  );
}
