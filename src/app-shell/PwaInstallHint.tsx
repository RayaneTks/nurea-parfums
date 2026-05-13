"use client";

import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "nurea-pwa-hint-dismissed-v1";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS Safari property
    window.navigator.standalone === true
  );
}

function isIOSSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIOS && isSafari;
}

/**
 * Bannière discrète invitant à installer le PWA sur l'écran d'accueil iOS.
 *
 * - Affichée uniquement sur iOS Safari, hors mode standalone, si non dismissée.
 * - Stockée dans localStorage pour ne pas re-apparaître après dismiss.
 */
export function PwaInstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;
    if (!isIOSSafari()) return;
    if (localStorage.getItem(STORAGE_KEY) === "1") return;
    setShow(true);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore quota / private browsing
    }
    setShow(false);
  };

  return (
    <div
      className={cn(
        "mx-4 mt-3 flex items-start gap-3 rounded-[14px] px-3 py-2.5",
      )}
      style={{
        background: "var(--admin-accent-bg)",
        border: "1px solid var(--admin-accent)",
      }}
    >
      <Share size={16} className="mt-0.5 shrink-0 text-[var(--admin-accent)]" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-[var(--admin-text)]">
          Installer Nuréa Admin
        </p>
        <p className="mt-0.5 text-[12px] text-[var(--admin-text-muted)]">
          Appuie sur Partager puis « Sur l'écran d'accueil ».
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Masquer"
        className="-mr-1 shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--admin-text-subtle)] tap-scale"
      >
        <X size={14} />
      </button>
    </div>
  );
}
