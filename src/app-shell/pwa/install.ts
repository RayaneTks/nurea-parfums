"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Installation de la PWA de gestion (04 §14.1, 06 E01 zone 2, friction F-4.7-03).
 *
 * L'existant ne proposait l'installation qu'à Safari iOS, par une bannière FIXE qui comprimait en
 * permanence l'écran le plus dense (05 §7 n°12). Ici : une carte dans le flux de l'Accueil, une
 * seule à la fois, fermable **définitivement** (mémorisé sur l'appareil, jamais en base — c'est un
 * réglage de ce téléphone, pas de l'entreprise).
 *
 * Deux modes :
 * - `prompt` — le navigateur a proposé `beforeinstallprompt` (Android, Chrome/Edge desktop) : on
 *   retient l'événement et on l'ouvre au tap ;
 * - `ios` — Safari iOS, qui n'émet rien : on donne la consigne « Partager → Sur l'écran d'accueil ».
 *
 * L'écoute est posée à l'import du module : `beforeinstallprompt` arrive souvent avant que la carte
 * ne soit montée, et un événement non retenu est perdu.
 */

export type InstallMode = "prompt" | "ios";

/** Fermeture définitive de la carte, sur CET appareil. */
export const INSTALL_DISMISSED_KEY = "nurea:pwa:installation-fermee";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const subscribers = new Set<() => void>();

function emit(): void {
  for (const notify of subscribers) notify();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    // Sans `preventDefault`, Chrome affiche sa propre invite : deux propositions pour une action.
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    emit();
  });
}

/** Déjà lancée depuis l'écran d'accueil : il n'y a plus rien à installer. */
export function isStandalone(win: Window = window): boolean {
  const iosStandalone = (win.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || win.matchMedia?.("(display-mode: standalone)").matches === true;
}

/**
 * Safari iOS, seul navigateur de l'iPhone à savoir « Sur l'écran d'accueil ». Chrome et Firefox iOS
 * (`CriOS`, `FxiOS`) partagent le moteur mais pas ce menu : leur donner la consigne serait faux.
 *
 * `"standalone" in navigator` d'abord : c'est une propriété que SEUL WebKit iOS expose, et elle
 * distingue le vrai Safari d'un navigateur qui se contente d'en prendre le nom — un Chromium émulant
 * un iPhone (les tests, les outils de développement) a l'agent utilisateur mais pas la propriété. Une
 * consigne de partage affichée là serait une consigne impossible à suivre.
 */
export function isIosSafari(navigatorLike: Navigator = navigator): boolean {
  if (!("standalone" in navigatorLike)) return false;
  const ua = navigatorLike.userAgent ?? "";
  const iPadOs = navigatorLike.platform === "MacIntel" && (navigatorLike.maxTouchPoints ?? 0) > 1;
  if (!/iPhone|iPad|iPod/.test(ua) && !iPadOs) return false;
  return !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(INSTALL_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export type PwaInstall = {
  /** `null` : rien à proposer (déjà installée, carte fermée, navigateur sans chemin d'installation). */
  mode: InstallMode | null;
  /** Ouvre l'invite du navigateur (mode `prompt`). Sans effet en mode `ios`. */
  install: () => void;
  /** Ferme la carte définitivement sur cet appareil. */
  dismiss: () => void;
};

export function usePwaInstall(): PwaInstall {
  const [mode, setMode] = useState<InstallMode | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const compute = () => {
      if (readDismissed() || isStandalone()) {
        setDismissed(true);
        setMode(null);
        return;
      }
      setDismissed(false);
      setMode(deferredPrompt ? "prompt" : isIosSafari() ? "ios" : null);
    };
    compute();
    subscribers.add(compute);
    return () => {
      subscribers.delete(compute);
    };
  }, []);

  const install = useCallback(() => {
    const event = deferredPrompt;
    if (!event) return;
    // Une invite ne se rejoue pas : l'événement est consommé, quel que soit le choix.
    deferredPrompt = null;
    void event.prompt().catch(() => undefined);
    void event.userChoice
      .then(({ outcome }) => {
        if (outcome === "accepted") setDismissed(true);
      })
      .catch(() => undefined)
      .finally(emit);
  }, []);

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(INSTALL_DISMISSED_KEY, "1");
    } catch {
      /* stockage refusé : la fermeture vaut pour cette session */
    }
    setDismissed(true);
    setMode(null);
  }, []);

  return { mode: dismissed ? null : mode, install, dismiss };
}
