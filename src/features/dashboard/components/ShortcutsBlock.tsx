import Link from "next/link";
import { BarChart3, Boxes, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Shortcut = { href: string; label: string; icon: LucideIcon };

/**
 * Raccourcis vers les écrans SANS onglet dédié.
 *
 * L'ancienne grille « Actions » proposait six tuiles dont quatre menaient à un
 * onglet visible juste en dessous, dans la barre : deux chemins pour la même
 * destination, à un pouce d'écart. Ne restent ici que les écrans réellement
 * inaccessibles depuis la barre d'onglets.
 */
const SHORTCUTS: readonly Shortcut[] = [
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/lots", label: "Lots", icon: Boxes },
  { href: "/admin/stats/top-parfums", label: "Statistiques", icon: BarChart3 },
] as const;

export function ShortcutsBlock() {
  return (
    <nav aria-label="Raccourcis" className="grid grid-cols-3 gap-2">
      {SHORTCUTS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          prefetch
          className={cn(
            "flex min-h-[var(--admin-touch-min)] flex-col items-center justify-center gap-1.5 rounded-[14px] py-3 tap-scale",
            "bg-[var(--admin-surface)] text-[var(--admin-text)]",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
          )}
          style={{ border: "1px solid var(--admin-border)" }}
        >
          <Icon size={19} strokeWidth={2} className="text-[var(--admin-accent)]" aria-hidden />
          <span className="text-[12px] font-semibold leading-none">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
