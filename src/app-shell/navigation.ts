import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  Home,
  Package,
  PlusCircle,
  TrendingUp,
} from "lucide-react";

/**
 * Source de vérité de la navigation admin.
 *
 * Cinq onglets — limite des Human Interface Guidelines iOS : au-delà, les
 * libellés se tronquent et la cible tactile passe sous 44 px.
 *
 * Toute route `/admin/*` doit être rattachée à exactement un onglet
 * (`match`), sinon la barre n'affiche aucun état actif et l'utilisateur perd
 * le fil de sa navigation.
 */

export type AdminTab = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Traitement visuel accentué (action principale de l'app). */
  emphasis?: boolean;
  match: (pathname: string) => boolean;
};

export const ADMIN_TABS: readonly AdminTab[] = [
  {
    href: "/admin",
    label: "Accueil",
    icon: Home,
    // L'onglet Accueil sert de rattachement aux écrans transverses (clients,
    // statistiques, réglages) qui n'ont pas d'onglet dédié.
    match: (p) =>
      p === "/admin" ||
      p.startsWith("/admin/clients") ||
      p.startsWith("/admin/stats") ||
      p.startsWith("/admin/reglages") ||
      p.startsWith("/admin/offline"),
  },
  {
    href: "/admin/ordres",
    label: "Commandes",
    icon: ClipboardList,
    match: (p) => p.startsWith("/admin/ordres"),
  },
  {
    href: "/admin/vendre",
    label: "Vendre",
    icon: PlusCircle,
    emphasis: true,
    match: (p) => p.startsWith("/admin/vendre"),
  },
  {
    href: "/admin/compta",
    label: "Compta",
    icon: TrendingUp,
    match: (p) =>
      p.startsWith("/admin/compta") ||
      p.startsWith("/admin/lots") ||
      p.startsWith("/admin/encaisser"),
  },
  {
    href: "/admin/catalogue",
    label: "Catalogue",
    icon: Package,
    match: (p) =>
      p.startsWith("/admin/catalogue") ||
      p.startsWith("/admin/perfumes") ||
      p.startsWith("/admin/brands"),
  },
] as const;

/**
 * Écran parent d'une route de détail, pour le bouton retour du header.
 *
 * Ordre significatif : la première règle qui correspond gagne, donc les routes
 * les plus profondes doivent précéder les plus courtes.
 *
 * `pattern` accepte un `:id` qui capture un segment. Une page d'édition doit
 * revenir à SA fiche, pas à la liste : sortir d'un formulaire ne doit pas
 * faire perdre le contexte sur lequel on travaillait.
 */
type ParentRule = {
  pattern: string;
  /** `:id` est remplacé par le segment capturé. */
  href: string;
  label: string;
};

const PARENTS: readonly ParentRule[] = [
  { pattern: "/admin/clients/:id/edit", href: "/admin/clients/:id", label: "Fiche client" },
  { pattern: "/admin/ordres/:id/edit", href: "/admin/ordres/:id", label: "Commande" },
  { pattern: "/admin/perfumes/*", href: "/admin/catalogue", label: "Catalogue" },
  { pattern: "/admin/brands/*", href: "/admin/catalogue?tab=brands", label: "Marques" },
  { pattern: "/admin/ordres/*", href: "/admin/ordres", label: "Commandes" },
  { pattern: "/admin/clients/*", href: "/admin/clients", label: "Clients" },
  { pattern: "/admin/clients", href: "/admin", label: "Accueil" },
  { pattern: "/admin/lots/*", href: "/admin/lots", label: "Lots" },
  { pattern: "/admin/lots", href: "/admin/compta", label: "Compta" },
  { pattern: "/admin/encaisser", href: "/admin", label: "Accueil" },
  { pattern: "/admin/stats/*", href: "/admin", label: "Accueil" },
  { pattern: "/admin/reglages/*", href: "/admin", label: "Accueil" },
];

/** Confronte un chemin à un motif ; retourne l'`id` capturé, ou `null`. */
function matchPattern(pathname: string, pattern: string): { id?: string } | null {
  const isPrefix = pattern.endsWith("/*");
  const patternParts = (isPrefix ? pattern.slice(0, -2) : pattern).split("/");
  const pathParts = pathname.split("/");

  if (isPrefix ? pathParts.length < patternParts.length : pathParts.length !== patternParts.length) {
    return null;
  }

  let id: string | undefined;
  for (let i = 0; i < patternParts.length; i += 1) {
    const expected = patternParts[i]!;
    const actual = pathParts[i];
    if (actual === undefined) return null;
    if (expected === ":id") {
      id = actual;
      continue;
    }
    if (expected !== actual) return null;
  }
  return { id };
}

export type AdminParent = { href: string; label: string };

/**
 * Retourne l'écran parent, ou `null` si `pathname` est la racine d'un onglet
 * (une racine d'onglet ne doit jamais afficher de bouton retour).
 */
export function getParentScreen(pathname: string): AdminParent | null {
  if (ADMIN_TABS.some((tab) => tab.href === pathname)) return null;
  for (const rule of PARENTS) {
    const hit = matchPattern(pathname, rule.pattern);
    if (!hit) continue;
    const href = hit.id ? rule.href.replace(":id", hit.id) : rule.href;
    // Une route ne peut pas être son propre parent (garde-fou si un motif
    // devient trop permissif après une évolution).
    if (href === pathname) continue;
    return { href, label: rule.label };
  }
  return null;
}
