"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ClipboardList,
  Home,
  Loader2,
  Package,
  PlusCircle,
  Search,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { statusLabel } from "@/domain/order-status";
import type { GlobalSearchResult } from "@/server/search/queries";

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const GROUP_CLS =
  "px-1.5 [&_[cmdk-group-heading]]:px-1.5 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.06em] [&_[cmdk-group-heading]]:text-[var(--admin-text-subtle)]";

const ITEM_CLS =
  "flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] data-[selected=true]:bg-[var(--admin-accent-bg)] data-[selected=true]:text-[var(--admin-accent)]";

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

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const trimmed = query.trim();
  const searching = trimmed.length >= 2;

  // Reset à la fermeture.
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults(null);
      setLoading(false);
    }
  }, [open]);

  // Recherche débouncée (200 ms) sur les données admin.
  useEffect(() => {
    if (trimmed.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/admin/search?q=${encodeURIComponent(trimmed)}`, {
        credentials: "include",
        signal: ctrl.signal,
      })
        .then((r) => (r.ok ? (r.json() as Promise<GlobalSearchResult>) : null))
        .then((data) => {
          if (data) setResults(data);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [trimmed]);

  const hasResults =
    !!results &&
    (results.perfumes.length > 0 ||
      results.customers.length > 0 ||
      results.orders.length > 0);

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
          label="Recherche"
          loop
          shouldFilter={!searching}
          className="overflow-hidden rounded-[18px] bg-[var(--admin-surface)] shadow-[var(--admin-shadow-xl)]"
          style={{ border: "1px solid var(--admin-border)" }}
        >
          <div
            className="flex items-center gap-2 px-3 py-2.5"
            style={{ borderBottom: "1px solid var(--admin-border)" }}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin text-[var(--admin-text-subtle)]" aria-hidden />
            ) : (
              <Search size={16} className="text-[var(--admin-text-subtle)]" aria-hidden />
            )}
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Parfum, client, commande…"
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-[var(--admin-text-subtle)] text-[var(--admin-text)]"
            />
            <kbd className="rounded-md border border-[var(--admin-border-strong)] bg-[var(--admin-bg)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--admin-text-subtle)]">
              ⌘K
            </kbd>
          </div>
          <Command.List
            className="overflow-y-auto px-1.5 py-2 [-webkit-overflow-scrolling:touch]"
            style={{ maxHeight: "calc(60dvh - var(--admin-keyboard-inset, 0px))" }}
          >
            {searching ? (
              <>
                {!loading && !hasResults ? (
                  <div className="px-3 py-6 text-center text-[14px] text-[var(--admin-text-muted)]">
                    Aucun résultat pour « {trimmed} ».
                  </div>
                ) : null}

                {results && results.perfumes.length > 0 ? (
                  <Command.Group heading="Parfums" className={GROUP_CLS}>
                    {results.perfumes.map((p) => (
                      <Command.Item
                        key={`perfume-${p.id}`}
                        value={`perfume-${p.id}`}
                        onSelect={() => go(`/admin/perfumes/${p.id}/edit`)}
                        className={ITEM_CLS}
                      >
                        <Package size={16} aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{p.name}</span>
                          <span className="block truncate text-[12px] text-[var(--admin-text-subtle)]">
                            {p.brandName}
                          </span>
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                ) : null}

                {results && results.customers.length > 0 ? (
                  <Command.Group heading="Clients" className={GROUP_CLS}>
                    {results.customers.map((c) => (
                      <Command.Item
                        key={`customer-${c.id}`}
                        value={`customer-${c.id}`}
                        onSelect={() => go(`/admin/clients/${c.id}`)}
                        className={ITEM_CLS}
                      >
                        <UserRound size={16} aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{c.fullName}</span>
                          {c.phoneE164 ? (
                            <span className="block truncate text-[12px] text-[var(--admin-text-subtle)]">
                              {c.phoneE164}
                            </span>
                          ) : null}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                ) : null}

                {results && results.orders.length > 0 ? (
                  <Command.Group heading="Commandes" className={GROUP_CLS}>
                    {results.orders.map((o) => (
                      <Command.Item
                        key={`order-${o.id}`}
                        value={`order-${o.id}`}
                        onSelect={() => go(`/admin/ordres/${o.id}`)}
                        className={ITEM_CLS}
                      >
                        <ClipboardList size={16} aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{o.customerName}</span>
                          <span className="block truncate text-[12px] text-[var(--admin-text-subtle)]">
                            {statusLabel(o.status)} ·{" "}
                            {new Date(o.orderedAt).toLocaleDateString("fr-FR")}
                          </span>
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                ) : null}
              </>
            ) : (
              <>
                <Command.Empty className="px-3 py-6 text-center text-[14px] text-[var(--admin-text-muted)]">
                  Aucun résultat.
                </Command.Empty>
                {(["Navigation", "Créer"] as const).map((group) => {
                  const items = actions.filter((a) => a.group === group);
                  if (items.length === 0) return null;
                  return (
                    <Command.Group key={group} heading={group} className={GROUP_CLS}>
                      {items.map((a) => {
                        const Icon = a.icon;
                        return (
                          <Command.Item
                            key={a.id}
                            value={`${a.group} ${a.label} ${a.hint ?? ""}`}
                            onSelect={a.run}
                            className={ITEM_CLS}
                          >
                            <Icon size={16} aria-hidden />
                            <span className="flex-1">{a.label}</span>
                            {a.hint ? (
                              <span className="text-[12px] text-[var(--admin-text-subtle)]">
                                {a.hint}
                              </span>
                            ) : null}
                          </Command.Item>
                        );
                      })}
                    </Command.Group>
                  );
                })}
              </>
            )}
          </Command.List>
        </Command>
      </div>
    </>
  );
}
