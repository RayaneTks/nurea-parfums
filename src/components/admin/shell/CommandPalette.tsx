"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ClipboardList,
  Home,
  Package,
  PlusCircle,
  Search,
  Settings,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";

type CommandPaletteProps = {
  /** Hot key (default Cmd+K / Ctrl+K). */
  triggerKey?: "k";
};

type Action = {
  id: string;
  label: string;
  hint?: string;
  icon: typeof Home;
  group: "Navigation" | "Créer" | "Recherche";
  run: () => void;
};

export function CommandPalette(_props: CommandPaletteProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  const actions: Action[] = [
    { id: "nav.dashboard", label: "Tableau de bord", icon: Home, group: "Navigation", run: () => go("/admin") },
    { id: "nav.catalogue", label: "Catalogue", icon: Package, group: "Navigation", run: () => go("/admin/catalogue") },
    { id: "nav.ordres", label: "Commandes", icon: ClipboardList, group: "Navigation", run: () => go("/admin/ordres") },
    { id: "nav.vendre", label: "Vendre", icon: PlusCircle, group: "Navigation", run: () => go("/admin/vendre") },
    { id: "nav.compta", label: "Compta", icon: TrendingUp, group: "Navigation", run: () => go("/admin/compta") },
    { id: "nav.clients", label: "Clients", icon: Users, group: "Navigation", run: () => go("/admin/clients") },
    {
      id: "new.order",
      label: "Nouvelle commande",
      hint: "Créer une commande",
      icon: ClipboardList,
      group: "Créer",
      run: () => go("/admin/ordres/new"),
    },
    {
      id: "new.quick-order",
      label: "Commande rapide",
      hint: "1 écran, 30 secondes",
      icon: PlusCircle,
      group: "Créer",
      run: () => go("/admin/ordres/new?mode=quick"),
    },
    {
      id: "new.sale",
      label: "Nouvelle vente",
      hint: "Vente directe (sans commande)",
      icon: PlusCircle,
      group: "Créer",
      run: () => go("/admin/vendre"),
    },
    {
      id: "new.perfume",
      label: "Nouveau parfum",
      icon: Package,
      group: "Créer",
      run: () => go("/admin/perfumes/new"),
    },
    {
      id: "new.customer",
      label: "Nouveau client",
      icon: UserRound,
      group: "Créer",
      run: () => go("/admin/clients/new"),
    },
    { id: "nav.settings", label: "Paramètres", icon: Settings, group: "Navigation", run: () => go("/admin/settings") },
  ];

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Fermer la palette de commandes"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[80] bg-black/30 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in"
        />
      ) : null}
      {open ? (
        <Command
          label="Palette de commandes"
          className="fixed left-1/2 top-[12vh] z-[90] w-[min(560px,92vw)] -translate-x-1/2 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl motion-safe:animate-in motion-safe:zoom-in-95"
          loop
        >
          <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-3">
            <Search size={18} className="text-neutral-500" aria-hidden />
            <Command.Input
              autoFocus
              placeholder="Rechercher ou commander… (Échap pour fermer)"
              className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
            />
            <kbd className="rounded-md border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
              ⌘K
            </kbd>
          </div>
          <Command.List className="max-h-[60vh] overflow-y-auto px-1.5 py-2">
            <Command.Empty className="px-3 py-6 text-center text-sm text-neutral-500">
              Aucun résultat.
            </Command.Empty>
            {(["Navigation", "Créer", "Recherche"] as const).map((group) => {
              const items = actions.filter((a) => a.group === group);
              if (items.length === 0) return null;
              return (
                <Command.Group key={group} heading={group} className="px-1.5 [&_[cmdk-group-heading]]:px-1.5 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-neutral-500">
                  {items.map((a) => {
                    const Icon = a.icon;
                    return (
                      <Command.Item
                        key={a.id}
                        value={`${a.group} ${a.label} ${a.hint ?? ""}`}
                        onSelect={a.run}
                        className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm aria-selected:bg-nurea-bordeaux/8 aria-selected:text-nurea-bordeaux data-[selected=true]:bg-nurea-bordeaux/8 data-[selected=true]:text-nurea-bordeaux"
                      >
                        <Icon size={16} aria-hidden />
                        <span className="flex-1">{a.label}</span>
                        {a.hint ? (
                          <span className="text-xs text-neutral-500">{a.hint}</span>
                        ) : null}
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              );
            })}
          </Command.List>
        </Command>
      ) : null}
    </>
  );
}
