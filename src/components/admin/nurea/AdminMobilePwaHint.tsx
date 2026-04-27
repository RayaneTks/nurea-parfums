"use client";

import { useCallback, useEffect, useState } from "react";
import { Share, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "nurea.admin.pwaInstallHintDismissed.v1";

function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return true;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

function isCoarsePointerMobile(): boolean {
  if (typeof window === "undefined") return false;
  const narrow = window.matchMedia("(max-width: 767px)").matches;
  const touch = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  return narrow && touch;
}

/**
 * Suggestion d’ajout à l’écran d’accueil (iOS / Android) pour le panel admin
 * ouvert dans le navigateur — masqué en mode PWA déjà installé.
 */
export function AdminMobilePwaHint() {
  const [show, setShow] = useState(false);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  }, []);

  useEffect(() => {
    if (isStandalonePwa()) return;
    if (!isCoarsePointerMobile()) return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div
      className="shrink-0 border-b border-nurea-bordeaux/15 bg-nurea-bordeaux/[0.06] px-4 py-3 text-admin-text"
      role="complementary"
      aria-label="Installation sur l’écran d’accueil"
    >
      <div className="mx-auto flex w-full max-w-[430px] items-start gap-2">
        <div
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-nurea-bordeaux/10 text-nurea-bordeaux"
          aria-hidden
        >
          <Share className="h-4 w-4" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold leading-snug text-admin-text">
            Conseil : installez l’app sur l’écran d’accueil
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-admin-muted">
            <span className="whitespace-nowrap sm:whitespace-normal">iOS :</span> touchez{" "}
            <span className="font-medium text-admin-text/90">Partager</span>{" "}
            <span className="text-admin-subtle" aria-hidden>
              {" "}
            </span>
            puis <span className="font-medium text-admin-text/90">Sur l’écran d’accueil</span>.{" "}
            <span className="whitespace-nowrap sm:whitespace-normal">Android :</span> menu{" "}
            <span className="font-medium text-admin-text/90">⋮</span> ou bannière «&nbsp;Installer&nbsp;».
          </p>
          <p className="mt-2 border-t border-nurea-bordeaux/10 pt-2 text-center">
            <button
              type="button"
              onClick={dismiss}
              className={cn(
                "text-[10px] font-medium uppercase tracking-wider text-admin-subtle",
                "underline decoration-admin-border/80 underline-offset-2 transition-colors",
                "tap-scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nurea-bordeaux/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                "[@media(hover:hover)]:text-admin-muted",
              )}
            >
              Accéder quand même via le web
            </button>
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="tap-scale -m-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-admin-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nurea-bordeaux/30"
          aria-label="Masquer le message"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
