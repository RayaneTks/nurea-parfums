import Link from "next/link";
import { ArrowRight, ClipboardList, PlusCircle, TrendingUp, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/ui/primitives/Card";

const ACTIONS: Array<{ href: string; label: string; description?: string; icon: LucideIcon }> = [
  {
    href: "/admin/ordres/new?mode=quick",
    label: "Commande rapide",
    description: "1 écran, 30 secondes",
    icon: PlusCircle,
  },
  { href: "/admin/ordres", label: "Commandes du jour", icon: ClipboardList },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/compta", label: "Compta", icon: TrendingUp },
];

export function QuickActionsBlock() {
  return (
    <Card padding={3}>
      <h2 className="mb-3 text-[14px] font-semibold text-[var(--admin-text)]">Raccourcis</h2>
      <ul className="space-y-2">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <li key={a.href}>
              <Link
                href={a.href}
                prefetch
                className="group flex items-center gap-3 rounded-[12px] px-3 py-2.5 tap-scale active:bg-[var(--admin-surface-muted)]"
                style={{ border: "1px solid var(--admin-border)" }}
              >
                <span
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
                  style={{ background: "var(--admin-accent-bg)", color: "var(--admin-accent)" }}
                >
                  <Icon size={16} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium leading-tight text-[var(--admin-text)]">
                    {a.label}
                  </p>
                  {a.description ? (
                    <p className="mt-0.5 text-[11px] text-[var(--admin-text-subtle)]">
                      {a.description}
                    </p>
                  ) : null}
                </div>
                <ArrowRight size={14} className="shrink-0 text-[var(--admin-text-subtle)]" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
