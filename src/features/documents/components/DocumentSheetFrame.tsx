"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useShellSheet } from "@/app-shell/SheetRegistry";
import { Sheet } from "@/ui/primitives/Sheet";
import { useDocumentSheetNavigation } from "./useDocumentSheetNavigation";

/**
 * Le cadre de la fiche document (06 S01, A-3) : UNE sheet, ouverte dès que l'URL porte `doc`, qui reste montée
 * pendant que son contenu arrive (squelette → fiche) — la sheet ne rejoue jamais son entrée. Le contenu, rendu
 * dans le bloc streamé, déclare le titre, la description, le menu, le pied et la garde de fermeture par
 * `useSheetChrome` ; la fermeture anime la sheet PUIS retire `doc` de l'URL.
 */

export type SheetChrome = {
  title: ReactNode;
  description?: ReactNode;
  trailing?: ReactNode;
  footer?: ReactNode;
  /** `false` en édition ou dès qu'une saisie est modifiée : glisser ne ferme pas. */
  dismissible?: boolean;
  /** Garde de fermeture (« Abandonner la saisie ? ») : `false` garde la sheet ouverte. */
  beforeClose?: () => Promise<boolean> | boolean;
};

type FrameValue = {
  setChrome: (chrome: SheetChrome | null) => void;
  requestClose: () => void;
};

const FrameContext = createContext<FrameValue | null>(null);

const DEFAULT_CHROME: SheetChrome = { title: "Fiche document" };

/** Durée de sortie d'une sheet (05 §2.6, 260 ms) et une marge. */
const CLOSE_DELAY_MS = 300;

export function DocumentSheetFrame({ children }: { children: ReactNode }) {
  const { close } = useDocumentSheetNavigation();
  const [open, setOpen] = useState(true);
  const [chrome, setChromeState] = useState<SheetChrome>(DEFAULT_CHROME);
  const chromeRef = useRef(chrome);
  const closing = useRef(false);

  useEffect(() => {
    chromeRef.current = chrome;
  }, [chrome]);

  const requestClose = useCallback(() => {
    if (closing.current) return;
    void (async () => {
      const guard = chromeRef.current.beforeClose;
      if (guard && !(await guard())) return;
      closing.current = true;
      setOpen(false);
      window.setTimeout(close, CLOSE_DELAY_MS);
    })();
  }, [close]);

  // Un tap sur l'onglet actif ferme d'abord la sheet du dessus (06 §1.5).
  useShellSheet(open, requestClose);

  const value = useMemo<FrameValue>(
    () => ({ setChrome: (next) => setChromeState(next ?? DEFAULT_CHROME), requestClose }),
    [requestClose],
  );

  /*
   * Saisie en cours dans la fiche (notes, prix d'une ligne) : le pied et la description s'effacent le temps de la
   * frappe. Clavier ouvert sur un iPhone SE, ils ne laissaient que 24 à 41 px au champ (invariant « sheet écrasée ») ;
   * l'action d'argent revient dès que le clavier se ferme (les notes s'enregistrent à la sortie du champ).
   */
  const [typingIn, setTypingIn] = useState<HTMLElement | null>(null);
  const typing = typingIn !== null && typingIn.isConnected;

  return (
    <FrameContext.Provider value={value}>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) requestClose();
        }}
        title={chrome.title}
        description={typing ? undefined : chrome.description}
        trailing={chrome.trailing}
        footer={typing ? undefined : chrome.footer}
        dismissible={chrome.dismissible ?? true}
      >
        <div
          className="contents"
          onFocus={(event) => {
            // Les sheets imbriquées sont portées ailleurs dans le DOM : leurs champs ne comptent pas ici.
            const target = event.target;
            if (isTextEntry(target) && event.currentTarget.contains(target)) setTypingIn(target);
          }}
          onBlur={(event) => {
            const next = event.relatedTarget;
            if (isTextEntry(next) && event.currentTarget.contains(next)) return;
            setTypingIn(null);
          }}
        >
          {children}
        </div>
      </Sheet>
    </FrameContext.Provider>
  );
}

/** Contrôles qui n'ouvrent pas le clavier (les dates ouvrent la roue d'iOS). */
const NON_TEXT_INPUTS = new Set([
  "button",
  "checkbox",
  "color",
  "date",
  "datetime-local",
  "file",
  "hidden",
  "image",
  "month",
  "radio",
  "range",
  "reset",
  "submit",
  "time",
  "week",
]);

/** Un champ qui ouvre le clavier : zone de texte, champ de saisie (hors cases, boutons, dates), contenu éditable. */
export function isTextEntry(target: EventTarget | null): target is HTMLElement {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLTextAreaElement) return !target.readOnly;
  if (target instanceof HTMLInputElement) return !target.readOnly && !NON_TEXT_INPUTS.has(target.type);
  return target.isContentEditable;
}

function useFrame(): FrameValue {
  const ctx = useContext(FrameContext);
  if (!ctx) throw new Error("Fiche document : composant hors de DocumentSheetFrame.");
  return ctx;
}

/**
 * Le contenu déclare l'habillage de la sheet à chaque rendu ; au démontage (squelette remplacé, erreur), l'habillage
 * par défaut revient.
 */
export function useSheetChrome(chrome: SheetChrome): void {
  const { setChrome } = useFrame();
  useLayoutEffect(() => {
    setChrome(chrome);
  });
  useLayoutEffect(() => () => setChrome(null), [setChrome]);
}

/** Fermer la fiche depuis son contenu (« Fermer », suppression, navigation vers une fiche client). */
export function useCloseDocumentSheet(): () => void {
  return useFrame().requestClose;
}
