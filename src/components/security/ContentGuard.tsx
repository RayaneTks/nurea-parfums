"use client";

import { useEffect } from "react";

/**
 * Dissuasion de la copie sur la vitrine : clic droit, glisser d'une image, raccourcis d'outils.
 *
 * **À lire avant d'y toucher — ce que ce composant ne fait PAS.** Il n'empêche pas de voir le code.
 * Le navigateur a reçu le HTML, les images et le JavaScript : ils sont sur la machine du visiteur,
 * et rien exécuté dans cette page ne peut le défaire. Les outils de développement s'ouvrent par le
 * menu du navigateur, et le code se lit par `view-source:`, par le cache disque, par `curl`, par
 * un miroir `wget` — aucun de ces chemins ne passe par un écouteur de clavier. Ce fichier relève
 * du droit d'auteur et de la friction, pas de la sécurité : il arrête le visiteur qui enregistre
 * une photo de flacon d'un clic droit, personne d'autre. La sécurité réelle est ailleurs — en-têtes
 * de `next.config.mjs`, authentification de la gestion, comptes de la marque.
 *
 * Ce qu'on refuse de faire, et pourquoi : pas de `debugger` en boucle (fige l'onglet et rend le
 * site inutilisable dès qu'un outil est ouvert, y compris pour nous), pas de détection d'outils
 * ouverts par mesure de fenêtre (faux positifs sur un écran partagé ou un navigateur ancré), pas de
 * blocage de la sélection de texte (une adresse ou un nom de parfum doit pouvoir se copier), pas de
 * page blanche punitive. On ne casse pas l'expérience d'un client pour gêner une minute celui qui
 * voulait l'image.
 */

/** Les champs de saisie gardent leur menu : couper, coller et correction orthographique y servent. */
function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/** Raccourcis d'inspection, sur les deux plateformes. `Ctrl+U` = code source, `F12` = outils. */
function isInspectShortcut(event: KeyboardEvent): boolean {
  const key = event.key.toLowerCase();
  if (key === "f12") return true;
  const mod = event.ctrlKey || event.metaKey;
  if (!mod) return false;
  if ((event.shiftKey || event.altKey) && (key === "i" || key === "j" || key === "c")) return true;
  return key === "u";
}

export function ContentGuard() {
  useEffect(() => {
    const onContextMenu = (event: MouseEvent) => {
      if (isEditable(event.target)) return;
      event.preventDefault();
    };

    const onDragStart = (event: DragEvent) => {
      if (event.target instanceof HTMLImageElement) event.preventDefault();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isInspectShortcut(event)) return;
      event.preventDefault();
    };

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("dragstart", onDragStart);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("dragstart", onDragStart);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return null;
}
