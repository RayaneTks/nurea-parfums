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
  ShoppingBag,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import type { CustomerHitDTO, DocumentHitDTO, PerfumeHitDTO, SearchResultsDTO } from "@/contracts/search";
import { SEARCH_MIN_LENGTH } from "@/contracts/search";
import { eur, eurFromWire, type MoneyString } from "@/domain/money";
import { cn } from "@/lib/utils";
import { ErrorBanner } from "@/ui/patterns/ErrorBanner";
import { ListSection } from "@/ui/patterns/ListSection";
import { Money } from "@/ui/patterns/Money";
import { formatDate } from "@/ui/patterns/date-format";
import { Avatar } from "@/ui/primitives/Avatar";
import { Badge } from "@/ui/primitives/Badge";
import { Button } from "@/ui/primitives/Button";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { ListRow } from "@/ui/primitives/ListRow";
import { SearchField } from "@/ui/primitives/SearchField";
import { SkeletonList } from "@/ui/primitives/Skeleton";
import { isToastTarget } from "@/ui/primitives/Toast";
import { useReadRoute } from "./hooks/useReadRoute";
import { isNavigable, routes, withSheet } from "./routes";
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

/** Route de lecture de la recherche à la frappe (04 §3.5) : une API, pas une adresse d'écran. */
const searchUrl = (q: string) => `/api/admin/search?scope=all&q=${encodeURIComponent(q)}`;

const positive = (value: MoneyString | null): value is MoneyString => value !== null && eur.compare(eurFromWire(value), eur.zero) > 0;

/** « Commande du 12 sept. · Fares » (06 §4.4). */
function documentLabel(hit: DocumentHitDTO): string {
  const title = `${hit.origin === "ORDER" ? "Commande" : "Vente"} du ${formatDate(new Date(hit.orderedAt), "short")}`;
  return hit.customerName ? `${title} · ${hit.customerName}` : title;
}

/**
 * Recherche globale S17 (06 §4.4) : dialogue plein écran sur Radix Dialog (focus piégé, défilement bloqué, focus
 * restitué à la fermeture), bande `commandPalette` au-dessus des sheets, champ focalisé à l'ouverture pour que le
 * clavier monte avec elle. Dès 2 caractères, la recherche à la frappe (debounce 200 ms, annulable) rend clients,
 * documents et parfums, par groupes de 6. Un document s'ouvre en fiche SUR L'ÉCRAN COURANT (la palette se ferme
 * d'abord) ; un parfum ouvre sa fiche ; une navigation ferme la palette. Les actions de résultat (« Encaisser »,
 * « Vendre ») arrivent au jalon J15.
 */
export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { navigate } = useShellNavigation();
  const trimmed = query.trim();
  const searching = trimmed.length >= SEARCH_MIN_LENGTH;
  const read = useReadRoute<SearchResultsDTO>(open && searching ? searchUrl(trimmed) : null, { debounceMs: 200 });

  const go = (href: string) => {
    onOpenChange(false);
    navigate(href);
  };

  /** La fiche document s'ouvre au-dessus de l'écran courant : on ne change jamais d'onglet (06 §1.3). */
  const openDocument = (id: string) => {
    onOpenChange(false);
    navigate(withSheet(`${window.location.pathname}${window.location.search}`, { doc: id }));
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

  const seeAll = (total: number, shown: number, href: string | null) =>
    href && total > shown && isNavigable(href) ? (
      <Button variant="text" size="sm" className="self-start" onClick={() => go(href)}>
        Voir les {total} résultats
      </Button>
    ) : undefined;

  const customerRow = (hit: CustomerHitDTO) => {
    const client = routes.client(hit.id);
    const encaisser = routes.encaisser({ q: hit.fullName });
    // Fiche client livrée au jalon J10 ; en attendant, un client qui doit de l'argent mène à ses créances.
    const target = isNavigable(client) ? client : positive(hit.due) ? encaisser : null;
    const common = {
      leading: <Avatar name={hit.fullName} size="md" />,
      primary: hit.fullName,
      secondary: hit.contact ?? undefined,
      trailing: positive(hit.due) ? <Money value={hit.due} tone="warning" bold /> : undefined,
    };
    return target ? <ListRow key={hit.id} {...common} onClick={() => go(target)} /> : <ListRow key={hit.id} {...common} />;
  };

  const documentRow = (hit: DocumentHitDTO) => (
    <ListRow
      key={hit.id}
      leading={
        hit.origin === "ORDER" ? (
          <ClipboardList size={20} aria-hidden className="text-[var(--admin-text-muted)]" />
        ) : (
          <ShoppingBag size={20} aria-hidden className="text-[var(--admin-text-muted)]" />
        )
      }
      primary={documentLabel(hit)}
      secondary={hit.status === "CANCELLED" ? "Annulée" : hit.status === "PENDING" ? "En attente" : undefined}
      trailing={positive(hit.due) ? <Money value={hit.due} tone="warning" bold /> : <Money value={hit.total} tone="muted" />}
      onClick={() => openDocument(hit.id)}
    />
  );

  const perfumeRow = (hit: PerfumeHitDTO) => (
    <ListRow
      key={hit.id}
      leading={<Avatar name={hit.name} src={hit.image || null} size="md" />}
      primary={hit.name}
      secondary={hit.brandName}
      trailing={
        hit.stockStatus === "out" ? (
          <Badge tone="danger">Rupture</Badge>
        ) : hit.status === "DRAFT" ? (
          <Badge>Masqué</Badge>
        ) : undefined
      }
      onClick={() => go(routes.parfum(hit.id))}
    />
  );

  let body: ReactNode;
  if (!searching) {
    body = (
      <>
        {section("Créer", CREATE)}
        {section("Aller à", GO_TO)}
      </>
    );
  } else if (read.error) {
    body = <ErrorBanner message="Recherche indisponible." onRetry={read.reload} />;
  } else if (!read.data) {
    body = <SkeletonList count={4} />;
  } else {
    const { customers, documents, perfumes } = read.data;
    const nothing = customers.total + documents.total + perfumes.total === 0;
    if (nothing) {
      const createCustomer = routes.nouveauClient({ nom: trimmed });
      const createPerfume = routes.nouveauParfum();
      const actions = [
        isNavigable(createCustomer) ? (
          <Button key="client" variant="secondary" onClick={() => go(createCustomer)}>
            Créer le client « {trimmed} »
          </Button>
        ) : null,
        isNavigable(createPerfume) ? (
          <Button key="parfum" variant="secondary" onClick={() => go(createPerfume)}>
            Créer le parfum « {trimmed} »
          </Button>
        ) : null,
      ].filter(Boolean);
      body =
        actions.length > 0 ? (
          <EmptyState title={`Rien ne correspond à « ${trimmed} »`} action={<div className="flex flex-col gap-2">{actions}</div>} />
        ) : (
          <EmptyState done title={`Rien ne correspond à « ${trimmed} »`} />
        );
    } else {
      body = (
        <div className={cn("flex flex-col gap-4", read.loading ? "opacity-70" : null)} aria-busy={read.loading || undefined}>
          {customers.total > 0 ? (
            <ListSection title="Clients" count={customers.total} footer={seeAll(customers.total, customers.items.length, routes.clients({ q: trimmed }))}>
              {customers.items.map(customerRow)}
            </ListSection>
          ) : null}
          {documents.total > 0 ? (
            <ListSection title="Documents" count={documents.total}>
              {documents.items.map(documentRow)}
            </ListSection>
          ) : null}
          {perfumes.total > 0 ? (
            <ListSection title="Parfums" count={perfumes.total} footer={seeAll(perfumes.total, perfumes.items.length, routes.catalogue({ q: trimmed }))}>
              {perfumes.items.map(perfumeRow)}
            </ListSection>
          ) : null}
        </div>
      );
    }
  }

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
            {body}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
