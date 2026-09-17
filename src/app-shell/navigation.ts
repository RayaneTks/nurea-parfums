import type { LucideIcon } from "lucide-react";
import { ClipboardList, Home, Package, PlusCircle, Users } from "lucide-react";
import { SHEET_PARAMS, withoutSheet } from "./routes";

/**
 * Source de vérité unique de l'architecture d'information (06 §1.4) : onglets, rattachements,
 * parents, mémoire d'onglet. Pur (aucun React) et testé par `__tests__/navigation.test.ts`.
 *
 * Invariants : cinq onglets, sans menu « Plus » ; toute route du shell appartient à exactement un
 * onglet ; l'onglet actif et le bouton retour racontent le même trajet (parent dans le même onglet).
 */

export type TabId = "accueil" | "commandes" | "vendre" | "clients" | "catalogue";

export type AdminTab = {
  id: TabId;
  href: string;
  label: string;
  icon: LucideIcon;
  /** Vendre : l'action la plus fréquente de la journée, traitée comme un bouton. */
  emphasis?: true;
  match: (pathname: string) => boolean;
  /**
   * Paramètres de la racine qui filtrent ou cherchent (06 §1.5, règle 4) : un tap sur l'onglet actif
   * les efface. Les paramètres de pré-remplissage de Vendre (`mode`, `client`…) n'en sont pas.
   */
  filterParams: readonly string[];
};

const under = (p: string, ...prefixes: string[]) => prefixes.some((x) => p === x || p.startsWith(`${x}/`));

export const ADMIN_TABS: readonly AdminTab[] = [
  {
    id: "accueil",
    href: "/admin",
    label: "Accueil",
    icon: Home,
    match: (p) =>
      p === "/admin" || under(p, "/admin/journee", "/admin/compta", "/admin/lots", "/admin/statistiques", "/admin/reglages"),
    filterParams: [],
  },
  {
    id: "commandes",
    href: "/admin/commandes",
    label: "Commandes",
    icon: ClipboardList,
    match: (p) => under(p, "/admin/commandes"),
    filterParams: ["vue", "filtre", "q"],
  },
  {
    id: "vendre",
    href: "/admin/vendre",
    label: "Vendre",
    icon: PlusCircle,
    emphasis: true,
    match: (p) => under(p, "/admin/vendre"),
    filterParams: [],
  },
  {
    id: "clients",
    href: "/admin/clients",
    label: "Clients",
    icon: Users,
    match: (p) => under(p, "/admin/clients", "/admin/encaisser"),
    filterParams: ["q"],
  },
  {
    id: "catalogue",
    href: "/admin/catalogue",
    label: "Catalogue",
    icon: Package,
    match: (p) => under(p, "/admin/catalogue"),
    filterParams: ["tab", "q", "stock", "visibilite"],
  },
];

const BASE = "https://nurea.invalid";

/** Chemin seul, que l'argument soit un chemin ou une URL relative avec query. */
function pathnameOf(pathOrUrl: string): string {
  const pathname = new URL(pathOrUrl, BASE).pathname;
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

function tabById(id: TabId): AdminTab {
  return ADMIN_TABS.find((tab) => tab.id === id) as AdminTab;
}

/** Onglet d'une route du shell ; `null` hors shell (E18) ou hors gestion. */
export function tabOf(pathOrUrl: string): TabId | null {
  const pathname = pathnameOf(pathOrUrl);
  return ADMIN_TABS.find((tab) => tab.match(pathname))?.id ?? null;
}

/** Vrai sur la racine d'un onglet. */
export function isTabRoot(pathOrUrl: string): boolean {
  const pathname = pathnameOf(pathOrUrl);
  return ADMIN_TABS.some((tab) => tab.href === pathname);
}

// ─── Retour (06 §1.5) ──────────────────────────────────────────────────────

type ParentRule = {
  /** `:id` capture un segment ; `/*` en fin de motif accepte toute profondeur. */
  pattern: string;
  /** `:id` est remplacé par le segment capturé. */
  href: string;
  label: string;
};

/** Première règle qui correspond gagne : motifs statiques (`nouveau`, `modifier`) avant `:id`. */
const PARENTS: readonly ParentRule[] = [
  { pattern: "/admin/compta/journal", href: "/admin/compta?vue=tresorerie", label: "Trésorerie" },
  { pattern: "/admin/compta", href: "/admin", label: "Accueil" },
  { pattern: "/admin/lots/nouveau", href: "/admin/lots", label: "Lots" },
  { pattern: "/admin/lots/:id", href: "/admin/lots", label: "Lots" },
  { pattern: "/admin/lots", href: "/admin", label: "Accueil" },
  { pattern: "/admin/journee", href: "/admin", label: "Accueil" },
  { pattern: "/admin/statistiques", href: "/admin", label: "Accueil" },
  { pattern: "/admin/reglages", href: "/admin", label: "Accueil" },
  { pattern: "/admin/encaisser", href: "/admin/clients", label: "Clients" },
  { pattern: "/admin/clients/nouveau", href: "/admin/clients", label: "Clients" },
  { pattern: "/admin/clients/:id/modifier", href: "/admin/clients/:id", label: "Fiche client" },
  { pattern: "/admin/clients/:id", href: "/admin/clients", label: "Clients" },
  { pattern: "/admin/catalogue/parfums/nouveau", href: "/admin/catalogue?tab=parfums", label: "Catalogue" },
  { pattern: "/admin/catalogue/parfums/:id/modifier", href: "/admin/catalogue/parfums/:id", label: "Parfum" },
  { pattern: "/admin/catalogue/parfums/:id", href: "/admin/catalogue?tab=parfums", label: "Catalogue" },
  { pattern: "/admin/catalogue/marques/*", href: "/admin/catalogue?tab=marques", label: "Marques" },
];

function matchPattern(pathname: string, pattern: string): { id?: string } | null {
  const isPrefix = pattern.endsWith("/*");
  const patternParts = (isPrefix ? pattern.slice(0, -2) : pattern).split("/");
  const pathParts = pathname.split("/");
  if (isPrefix ? pathParts.length <= patternParts.length : pathParts.length !== patternParts.length) return null;
  let id: string | undefined;
  for (let i = 0; i < patternParts.length; i += 1) {
    const expected = patternParts[i] as string;
    const actual = pathParts[i] as string;
    if (expected === ":id") {
      if (!actual) return null;
      id = actual;
    } else if (expected !== actual) {
      return null;
    }
  }
  return { id };
}

export type AdminParent = { href: string; label: string };

/** Écran parent (chevron du header), ou `null` sur une racine d'onglet et hors shell. */
export function getParentScreen(pathOrUrl: string): AdminParent | null {
  const pathname = pathnameOf(pathOrUrl);
  if (isTabRoot(pathname) || tabOf(pathname) === null) return null;
  for (const rule of PARENTS) {
    const hit = matchPattern(pathname, rule.pattern);
    if (!hit) continue;
    const href = hit.id ? rule.href.replace(":id", hit.id) : rule.href;
    // Garde-fou : une route n'est jamais son propre parent, même si un motif s'élargit un jour.
    if (pathnameOf(href) === pathname) continue;
    return { href, label: rule.label };
  }
  return null;
}

/** Pull-to-refresh sur les routes de lecture seulement (06 §3 règles communes, §4.1). */
export function allowsPullToRefresh(pathOrUrl: string): boolean {
  const pathname = pathnameOf(pathOrUrl);
  if (tabOf(pathname) === null) return false;
  if (under(pathname, "/admin/vendre", "/admin/catalogue/marques")) return false;
  return ![
    "/admin/catalogue/parfums/nouveau",
    "/admin/catalogue/parfums/:id/modifier",
    "/admin/clients/nouveau",
    "/admin/clients/:id/modifier",
    "/admin/lots/nouveau",
  ].some((pattern) => matchPattern(pathname, pattern));
}

// ─── Mémoire d'onglet (06 §1.5, amendement A-4) ────────────────────────────

type Remembered = { url: string; scrollTop: number };

/**
 * Mémoire de session, en mémoire du shell, jamais persistée : pour chaque onglet, son dernier écran,
 * et pour chaque écran visité son URL complète (filtres) et son défilement.
 */
export type TabMemory = {
  remember: (tab: TabId, url: string, scrollTop?: number) => void;
  /** Dernier écran de l'onglet (sans paramètre de sheet), ou `null` s'il n'a pas été visité. */
  last: (tab: TabId) => Remembered | null;
  /** Dernier passage sur ce chemin, dans cet onglet. */
  at: (tab: TabId, pathname: string) => Remembered | null;
  clear: () => void;
};

export function createTabMemory(): TabMemory {
  const lastUrl = new Map<TabId, string>();
  const byPath = new Map<TabId, Map<string, Remembered>>();

  const at = (tab: TabId, pathname: string) => byPath.get(tab)?.get(pathnameOf(pathname)) ?? null;

  return {
    remember(tab, rawUrl, scrollTop) {
      const url = withoutSheet(rawUrl);
      const pathname = pathnameOf(url);
      const screens = byPath.get(tab) ?? new Map<string, Remembered>();
      const previous = screens.get(pathname);
      // Sans mesure fournie, un écran revisité à la même adresse garde son défilement.
      const top = scrollTop ?? (previous?.url === url ? previous.scrollTop : 0);
      screens.set(pathname, { url, scrollTop: Math.max(0, Math.round(top)) });
      byPath.set(tab, screens);
      lastUrl.set(tab, pathname);
    },
    last(tab) {
      const pathname = lastUrl.get(tab);
      return pathname ? at(tab, pathname) : null;
    },
    at,
    clear() {
      lastUrl.clear();
      byPath.clear();
    },
  };
}

/** La mémoire du shell (une par onglet de navigateur, perdue au rechargement : c'est voulu). */
export const tabMemory = createTabMemory();

/** À chaque navigation et à chaque défilement : URL (sans sheet) et défilement de l'onglet courant. */
export function rememberTabLocation(tab: TabId, url: string, scrollTop?: number, memory: TabMemory = tabMemory): void {
  memory.remember(tab, url, scrollTop);
}

/** Vrai si la query porte un filtre ou une recherche de la racine de cet onglet. */
export function hasActiveFilters(tab: TabId, search: string): boolean {
  const params = new URLSearchParams(search);
  return tabById(tab).filterParams.some((key) => (params.get(key) ?? "") !== "");
}

/** Vrai si la query ouvre une sheet adressable (`doc`, `edition`, `assigner`). */
export function hasSheetParams(search: string): boolean {
  const params = new URLSearchParams(search);
  return SHEET_PARAMS.some((key) => params.has(key));
}

export type Destination = { url: string; scrollTop: number };

/**
 * Où mène le retour : le parent, et s'il figure dans la mémoire de l'onglet (même chemin, et mêmes
 * valeurs pour les paramètres que le parent fixe), son URL mémorisée avec ses filtres et son
 * défilement — E06 → E05 à la même position (06 §1.5).
 */
export function resolveBack(parent: AdminParent, memory: TabMemory = tabMemory): Destination {
  const tab = tabOf(parent.href);
  const target = new URL(parent.href, BASE);
  const remembered = tab ? memory.at(tab, target.pathname) : null;
  if (remembered) {
    const kept = new URL(remembered.url, BASE).searchParams;
    const compatible = [...target.searchParams].every(([key, value]) => kept.get(key) === value);
    if (compatible) return remembered;
  }
  return { url: parent.href, scrollTop: 0 };
}

export type TabPressContext = {
  activeTab: TabId | null;
  /** Une sheet est ouverte au-dessus de l'écran (adressable ou transitoire). */
  sheetOpen: boolean;
  /** L'écran courant est la racine de l'onglet actif. */
  isRoot: boolean;
  scrollTop: number;
  /** La racine porte des filtres ou une recherche (`hasActiveFilters`). */
  rootHasFilters: boolean;
};

export type TabPressAction =
  | { kind: "restore"; url: string; scrollTop: number }
  | { kind: "closeSheet" }
  | { kind: "goRoot"; url: string; scrollTop: number }
  | { kind: "scrollTop" }
  | { kind: "resetFilters"; url: string }
  | { kind: "none" };

/**
 * Ce que fait un tap sur un onglet (06 §1.5). Onglet inactif : son dernier écran, filtres et
 * défilement compris (première visite : la racine). Onglet actif, première condition vraie :
 * sheet ouverte → fermée ; hors racine → racine avec ses filtres mémorisés ; racine défilée → haut ;
 * racine filtrée → filtres effacés ; sinon rien.
 */
export function onTabPress(tab: TabId, ctx: TabPressContext, memory: TabMemory = tabMemory): TabPressAction {
  const root = tabById(tab).href;
  if (tab !== ctx.activeTab) {
    const last = memory.last(tab);
    return last ? { kind: "restore", url: last.url, scrollTop: last.scrollTop } : { kind: "restore", url: root, scrollTop: 0 };
  }
  if (ctx.sheetOpen) return { kind: "closeSheet" };
  if (!ctx.isRoot) {
    const atRoot = memory.at(tab, root);
    return atRoot ? { kind: "goRoot", url: atRoot.url, scrollTop: atRoot.scrollTop } : { kind: "goRoot", url: root, scrollTop: 0 };
  }
  if (ctx.scrollTop > 0) return { kind: "scrollTop" };
  if (ctx.rootHasFilters) return { kind: "resetFilters", url: root };
  return { kind: "none" };
}
