"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import {
  ClipboardList,
  Home,
  Package,
  PlusCircle,
  Search,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Action = {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  group: "Navigation" | "Créer";
  run: () => void;
};

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      } else if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;

    lastFocusedRef.current = document.activeElement as HTMLElement | null;

    const getFocusable = () =>
      dialogRef.current
        ? [
            ...dialogRef.current.querySelectorAll<HTMLElement>(
              'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])',
            ),
          ]
        : [];

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        const focusables = getFocusable();
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!first || !last) return;
        const active = document.activeElement as HTMLElement | null;

        if (e.shiftKey) {
          if (!active || active === first) {
            e.preventDefault();
            last.focus();
          }
        } else if (!active || active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKey);
    const first = getFocusable()[0];
    first?.focus();

    const html = document.documentElement;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      html.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      lastFocusedRef.current?.focus?.();
    };
  }, [open]);

  const go = useCallback(
    (href: string) => {
      onOpenChange(false);
      router.push(href);
    },
    [router, onOpenChange],
  );

  const actions: Action[] = [
    { id: "nav.dashboard", label: "Tableau de bord", icon: Home, group: "Navigation", run: () => go("/admin") },
    { id: "nav.catalogue", label: "Catalogue", icon: Package, group: "Navigation", run: () => go("/admin/catalogue") },
    { id: "nav.ordres", label: "Commandes", icon: ClipboardList, group: "Navigation", run: () => go("/admin/ordres") },
    { id: "nav.vendre", label: "Vendre", icon: PlusCircle, group: "Navigation", run: () => go("/admin/vendre") },
    { id: "nav.compta", label: "Compta", icon: TrendingUp, group: "Navigation", run: () => go("/admin/compta") },
    { id: "nav.clients", label: "Clients", icon: Users, group: "Navigation", run: () => go("/admin/clients") },

    { id: "new.quick-order", label: "Commande rapide", hint: "30 s", icon: PlusCircle, group: "Créer", run: () => go("/admin/ordres/new?mode=quick") },
    { id: "new.order", label: "Nouvelle commande", icon: ClipboardList, group: "Créer", run: () => go("/admin/ordres/new") },
    { id: "new.sale", label: "Nouvelle vente", icon: PlusCircle, group: "Créer", run: () => go("/admin/vendre") },
    { id: "new.perfume", label: "Nouveau parfum", icon: Package, group: "Créer", run: () => go("/admin/perfumes/new") },
    { id: "new.customer", label: "Nouveau client", icon: UserRound, group: "Créer", run: () => go("/admin/clients/new") },
  ];

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Fermer la palette"
        onClick={() => onOpenChange(false)}
        className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Palette de commandes"
        className="fixed left-1/2 top-[10dvh] z-[90] w-[min(420px,92vw)] -translate-x-1/2"
      >
        <Command
          label="Palette de commandes"
          loop
          className="overflow-hidden rounded-[18px] bg-[var(--admin-surface)] shadow-[var(--admin-shadow-xl)]"
          style={{ border: "1px solid var(--admin-border)" }}
        >
          <div
            className="flex items-center gap-2 px-3 py-2.5"
            style={{ borderBottom: "1px solid var(--admin-border)" }}
          >
            <Search size={16} className="text-[var(--admin-text-subtle)]" aria-hidden />
            <Command.Input
              autoFocus
              placeholder="Rechercher ou commander…"
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-[var(--admin-text-subtle)] text-[var(--admin-text)]"
            />
            <kbd className="rounded-md border border-[var(--admin-border-strong)] bg-[var(--admin-bg)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--admin-text-subtle)]">
              ⌘K
            </kbd>
          </div>
          <Command.List className="max-h-[60dvh] overflow-y-auto px-1.5 py-2">
            <Command.Empty className="px-3 py-6 text-center text-[14px] text-[var(--admin-text-muted)]">
              Aucun résultat.
            </Command.Empty>
            {(["Navigation", "Créer"] as const).map((group) => {
              const items = actions.filter((a) => a.group === group);
              if (items.length === 0) return null;
              return (
                <Command.Group
                  key={group}
                  heading={group}
                  className="px-1.5 [&_[cmdk-group-heading]]:px-1.5 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.06em] [&_[cmdk-group-heading]]:text-[var(--admin-text-subtle)]"
                >
                  {items.map((a) => {
                    const Icon = a.icon;
                    return (
                      <Command.Item
                        key={a.id}
                        value={`${a.group} ${a.label} ${a.hint ?? ""}`}
                        onSelect={a.run}
                        className="flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] data-[selected=true]:bg-[var(--admin-accent-bg)] data-[selected=true]:text-[var(--admin-accent)]"
                      >
                        <Icon size={16} aria-hidden />
                        <span className="flex-1">{a.label}</span>
                        {a.hint ? (
                          <span className="text-[12px] text-[var(--admin-text-subtle)]">{a.hint}</span>
                        ) : null}
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              );
            })}
          </Command.List>
        </Command>
      </div>
    </>
  );
}
