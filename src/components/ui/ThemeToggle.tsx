"use client";

import type { FC, MouseEvent } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bascule clair / sombre — barre haute et fiche parfum.
 *
 * Le nouveau thème s'ouvre en cercle depuis le bouton et recouvre l'écran : chaque visuel passe de
 * sa variante sombre à sa variante claire sous les yeux du visiteur (View Transitions, règles
 * `::view-transition-*` dans `app/globals.css`). Sans l'API, ou en mouvement réduit : bascule
 * immédiate. L'icône suit le thème en CSS ; seul le geste lit `resolvedTheme`.
 */
export const ThemeToggle: FC<{ className?: string }> = ({ className }) => {
  const { resolvedTheme, setTheme } = useTheme();

  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    const next = resolvedTheme === "light" ? "dark" : "light";
    const root = document.documentElement;
    // La classe est posée ici, tout de suite : la transition photographie l'écran juste après ce rappel,
    // avant que next-themes n'applique la sienne.
    const apply = () => {
      root.classList.remove("light", "dark");
      root.classList.add(next);
      root.style.colorScheme = next;
      setTheme(next);
    };

    if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      apply();
      return;
    }
    const box = event.currentTarget.getBoundingClientRect();
    root.style.setProperty("--reveal-x", `${box.left + box.width / 2}px`);
    root.style.setProperty("--reveal-y", `${box.top + box.height / 2}px`);
    // Transition sautée (onglet masqué, autre transition en cours) : le thème change quand même,
    // seule l'animation manque ; sa promesse rejetée n'est pas une erreur.
    document.startViewTransition(apply).ready.catch(() => {});
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Changer de thème (clair ou sombre)"
      className={cn(
        "press relative flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-fg-1 transition-[background-color,transform] duration-dur-2 ease-soft mouse-hover:bg-surface-2",
        className
      )}
    >
      <Sun size={20} strokeWidth={1.5} aria-hidden className="[.light_&]:hidden" />
      <Moon size={20} strokeWidth={1.5} aria-hidden className="hidden [.light_&]:block" />
    </button>
  );
};
