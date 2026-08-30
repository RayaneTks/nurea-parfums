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
    match: (p) => p.startsWith("/admin/compta") || p.startsWith("/admin/lots"),
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
 * Ordre significatif : la première entrée dont le préfixe correspond gagne,
 * donc les routes les plus profondes doivent précéder les plus courtes.
 */
const PARENTS: ReadonlyArray<{ prefix: string; href: string; label: string }> = [
  { prefix: "/admin/perfumes", href: "/admin/catalogue", label: "Catalogue" },
  { prefix: "/admin/brands", href: "/admin/catalogue?tab=brands", label: "Marques" },
  { prefix: "/admin/ordres/new", href: "/admin/ordres", label: "Commandes" },
  { prefix: "/admin/ordres/", href: "/admin/ordres", label: "Commandes" },
  { prefix: "/admin/clients/", href: "/admin/clients", label: "Clients" },
  { prefix: "/admin/clients", href: "/admin", label: "Accueil" },
  { prefix: "/admin/lots/", href: "/admin/lots", label: "Lots" },
  { prefix: "/admin/lots", href: "/admin/compta", label: "Compta" },
  { prefix: "/admin/stats", href: "/admin", label: "Accueil" },
  { prefix: "/admin/reglages", href: "/admin", label: "Accueil" },
];

export type AdminParent = { href: string; label: string };

/**
 * Retourne l'écran parent, ou `null` si `pathname` est la racine d'un onglet
 * (une racine d'onglet ne doit jamais afficher de bouton retour).
 */
export function getParentScreen(pathname: string): AdminParent | null {
  if (ADMIN_TABS.some((tab) => tab.href === pathname)) return null;
  const hit = PARENTS.find((p) => pathname.startsWith(p.prefix));
  return hit ? { href: hit.href, label: hit.label } : null;
}
