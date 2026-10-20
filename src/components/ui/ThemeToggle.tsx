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
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    // Rayon final = distance au coin le plus éloigné : toute la durée sert à l'animation visible.
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    root.style.setProperty("--reveal-x", `${x}px`);
    root.style.setProperty("--reveal-y", `${y}px`);
    root.style.setProperty("--reveal-r", `${Math.ceil(radius)}px`);
    // L'ancien écran reste figé tant que le rappel n'a pas rendu la main : on y attend que les
    // visuels du nouveau thème soient décodés (400 ms au plus), sinon le cercle découvrirait un aplat.
    // Pendant la bascule, le navigateur anime deux photos de l'écran : Safari y perd le flou du verre,
    // et le texte passerait net sous la barre. Le verre devient opaque le temps de l'animation.
    root.classList.add("theme-switching");
    const transition = document.startViewTransition(async () => {
      apply();
      const shown = [...document.querySelectorAll<HTMLImageElement>("#vitrine img")].filter(
        (img) => img.offsetParent !== null && img.getBoundingClientRect().bottom > 0 && img.getBoundingClientRect().top < innerHeight
      );
      await Promise.race([
        Promise.all(shown.map((img) => img.decode().catch(() => undefined))),
        new Promise((resolve) => setTimeout(resolve, 400)),
      ]);
    });
    // Transition sautée (onglet masqué, autre transition en cours) : le thème change quand même,
    // seule l'animation manque ; sa promesse rejetée n'est pas une erreur.
    transition.ready.catch(() => {});
    const done = () => root.classList.remove("theme-switching");
    transition.finished.then(done, done);
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
