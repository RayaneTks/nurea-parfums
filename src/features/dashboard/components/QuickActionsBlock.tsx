import Link from "next/link";
import {
  ClipboardList,
  PlusCircle,
  TrendingUp,
  UserRoundPlus,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/ui/primitives/Card";
import { cn } from "@/lib/utils";

type Action = {
  href: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  tone?: "accent" | "default";
};

const ACTIONS: Action[] = [
  {
    href: "/admin/ordres/new?mode=quick",
    label: "Commande rapide",
    description: "Un écran",
    icon: PlusCircle,
    tone: "accent",
  },
  {
    href: "/admin/vendre",
    label: "Vendre",
    description: "Encaisser",
    icon: PlusCircle,
  },
  {
    href: "/admin/clients/new",
    label: "Nouveau client",
    description: "Fiche vide",
    icon: UserRoundPlus,
  },
  {
    href: "/admin/clients",
    label: "Clients",
    description: "Liste",
    icon: Users,
  },
  {
    href: "/admin/ordres",
    label: "Commandes",
    description: "Suivi",
    icon: ClipboardList,
  },
  {
    href: "/admin/compta",
    label: "Compta",
    description: "Chiffres",
    icon: TrendingUp,
  },
];

export function QuickActionsBlock() {
  return (
    <Card padding={3}>
      <h2 className="mb-3 text-[14px] font-semibold text-[var(--admin-text)]">Actions</h2>
      <div className="grid grid-cols-2 gap-2">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          const accent = a.tone === "accent";
          return (
            <Link
              key={a.href}
              href={a.href}
              prefetch
              className={cn(
                "flex min-h-[var(--admin-touch-min)] flex-col justify-between gap-2 rounded-[12px] p-3 tap-scale",
                "transition-colors duration-[var(--admin-duration-fast)] ease-[var(--admin-easing-default)]",
                "active:scale-[0.97]",
                accent
                  ? "bg-[var(--admin-accent-bg)] text-[var(--admin-accent)]"
                  : "bg-[var(--admin-surface-muted)] text-[var(--admin-text)]",
              )}
              style={{ border: "1px solid var(--admin-border)" }}
            >
              <span
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-[10px]",
                  accent
                    ? "bg-[var(--admin-accent)] text-white"
                    : "bg-[var(--admin-surface)] text-[var(--admin-accent)]",
                )}
                aria-hidden
              >
                <Icon size={16} strokeWidth={2.2} />
              </span>
              <span>
                <span className="block text-[13px] font-semibold leading-tight">{a.label}</span>
                {a.description ? (
                  <span
                    className={cn(
                      "mt-0.5 block text-[11px]",
                      accent ? "text-[var(--admin-accent)]/80" : "text-[var(--admin-text-subtle)]",
                    )}
                  >
                    {a.description}
                  </span>
                ) : null}
              </span>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
