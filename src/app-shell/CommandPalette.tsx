"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  HandCoins,
  Landmark,
  LineChart,
  PackagePlus,
  PlusCircle,
  Settings,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ListSection } from "@/ui/patterns/ListSection";
import { Button } from "@/ui/primitives/Button";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { ListRow } from "@/ui/primitives/ListRow";
import { SearchField } from "@/ui/primitives/SearchField";
import { isToastTarget } from "@/ui/primitives/Toast";
import { isNavigable, routes } from "./routes";
import { useShellNavigation } from "./ShellNavigation";

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Entry = { id: string; label: string; icon: LucideIcon; href: string };

/**
 * « Créer » et « Aller à » de 06 §4.4 : n'apparaissent que les écrans déjà livrés — un raccourci ne
 * mène jamais à une page absente. Les autres rejoignent la liste au jalon de leur écran.
 */
const CREATE: Entry[] = [
  { id: "vente", label: "Nouvelle vente", icon: PlusCircle, href: routes.vendre() },
  { id: "commande", label: "Nouvelle commande", icon: ClipboardList, href: routes.vendre({ mode: "commande" }) },
  { id: "client", label: "Nouveau client", icon: UserPlus, href: routes.nouveauClient() },
  { id: "parfum", label: "Nouveau parfum", icon: PackagePlus, href: routes.nouveauParfum() },
].filter((entry) => isNavigable(entry.href));

const GO_TO: Entry[] = [
  { id: "compta", label: "Compta", icon: LineChart, href: routes.compta() },
  { id: "tresorerie", label: "Trésorerie", icon: Landmark, href: routes.compta({ vue: "tresorerie" }) },
  { id: "encaisser", label: "À encaisser", icon: HandCoins, href: routes.encaisser() },
  { id: "lots", label: "Lots", icon: Boxes, href: routes.lots() },
  { id: "statistiques", label: "Statistiques", icon: BarChart3, href: routes.statistiques() },
  { id: "reglages", label: "Réglages", icon: Settings, href: routes.reglages() },
].filter((entry) => isNavigable(entry.href));

/** La recherche à la frappe (clients, documents, parfums) arrive avec sa route de lecture (07 J8). */
const SEARCH_MILESTONE = "J8";

/**
 * Recherche globale S17 (06 §4.4) — cadre livré à J4 : dialogue plein écran sur Radix Dialog (focus
 * piégé, défilement bloqué, focus restitué à la fermeture), bande `commandPalette` au-dessus des sheets, champ focalisé
 * à l'ouverture pour que le clavier monte avec elle. Choisir une entrée ferme la palette en naviguant.
 */
export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { navigate } = useShellNavigation();
  const searching = query.trim().length >= 2;

  const go = (href: string) => {
    onOpenChange(false);
    navigate(href);
  };

  const section = (title: string, entries: Entry[]) =>
    entries.length > 0 ? (
      <ListSection title={title}>
        {entries.map((entry) => {
          const Icon = entry.icon;
          return (
            <ListRow
              key={entry.id}
              leading={<Icon size={20} className="text-[var(--admin-accent)]" aria-hidden />}
              primary={entry.label}
              onClick={() => go(entry.href)}
            />
          );
        })}
      </ListSection>
    ) : null;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) setQuery("");
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay data-admin-overlay className="fixed inset-0 z-[var(--admin-z-command-palette)] bg-[var(--admin-overlay)]" />
        <Dialog.Content
          aria-describedby={undefined}
          data-command-palette
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
          }}
          // Le toast passe au-dessus (05 §2.7) : le toucher ne ferme pas la palette.
          onPointerDownOutside={(event) => {
            if (isToastTarget(event.target)) event.preventDefault();
          }}
          className={cn(
            "admin-theme admin-safe-top fixed inset-x-0 bottom-0 top-0 z-[var(--admin-z-command-palette)] mx-auto flex max-w-[var(--admin-app-max-width)] flex-col outline-none",
            "bg-[var(--admin-bg)] shadow-[shadow:var(--admin-shadow-xl)]",
            "motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in motion-safe:data-[state=open]:[animation-duration:var(--admin-duration-slow)]",
          )}
        >
          <Dialog.Title className="sr-only">Recherche</Dialog.Title>
          <div className="flex shrink-0 items-center gap-2 border-b border-[var(--admin-border)] px-4 py-2">
            <SearchField
              ref={inputRef}
              value={query}
              onChange={setQuery}
              placeholder="Client, commande, parfum…"
              ariaLabel="Rechercher"
              className="flex-1"
            />
            <Dialog.Close asChild>
              <Button variant="text" className="shrink-0 px-2">
                Fermer
              </Button>
            </Dialog.Close>
          </div>

          <div
            className="flex flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 pt-4 [-webkit-overflow-scrolling:touch]"
            style={{ paddingBottom: "calc(var(--admin-space-6) + var(--admin-safe-area-bottom) + var(--admin-keyboard-inset, 0px))" }}
          >
            {searching ? (
              <EmptyState done title={`La recherche de clients, commandes et parfums arrive au jalon ${SEARCH_MILESTONE}.`} />
            ) : (
              <>
                {section("Créer", CREATE)}
                {section("Aller à", GO_TO)}
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
