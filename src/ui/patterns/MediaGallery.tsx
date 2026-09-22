"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Check, Download, ImagePlus, Pencil, Share2, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../primitives/Button";

export type MediaItem = {
  id: string;
  url: string;
  label: string | null;
  width: number;
  height: number;
};

type MediaGalleryProps = {
  items: readonly MediaItem[];
  /** Nom de fichier proposé au partage, sans extension : « nurea-dior-sauvage-story ». */
  fileNameFor: (item: MediaItem) => string;
  /** Fichiers choisis (plusieurs, HEIC compris) ; l'appelant les prépare et les envoie un par un. */
  onAdd?: (files: File[]) => void;
  /** « Retirer » : l'appelant confirme (`ConfirmDialog`) puis retire. La visionneuse se ferme d'abord. */
  onDelete?: (item: MediaItem) => void;
  /** Déplacer d'un rang (avant : -1, après : +1). Absent : pas de boutons d'ordre. */
  onMove?: (item: MediaItem, direction: -1 | 1) => void;
  /** Libellé libre ; rejeter garde la saisie ouverte avec le message. Absent : libellé en lecture. */
  onLabel?: (item: MediaItem, label: string) => Promise<void>;
  /** Dépôt en cours : « Ajouter des visuels » en attente, grille utilisable. */
  busy?: boolean;
  readOnly?: boolean;
  /** Ligne calme quand la galerie est vide. */
  emptyHint?: string;
  /** Libellé du bouton d'ajout (défaut « Ajouter des visuels »). */
  addLabel?: string;
};

export const SAVE_FAILED_MESSAGE = "Téléchargement impossible. Vérifie ta connexion.";

export type SaveOutcome = "shared" | "cancelled" | "downloaded";

type SaveEnvironment = {
  fetch: typeof fetch;
  navigator?: Partial<Pick<Navigator, "share">> & { canShare?: (data: { files: File[] }) => boolean };
  /** Enregistre un blob de même origine (lien `download`) ; injecté pour les tests. */
  download: (blob: Blob, fileName: string) => void;
};

/** Téléchargement de repli : un `<a download>` vers Supabase serait ignoré en cross-origin. */
function downloadBlob(blob: Blob, fileName: string): void {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Révoquée trop tôt, Safari abandonne le fichier.
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
}

/**
 * Récupère un visuel sur l'appareil (05 §3.2, reprise de la production `77985aa` + `3707715`) :
 * 1. **partage natif avec fichier** — la feuille de partage iOS, d'où la planche part vers Snapchat ou
 *    s'enregistre dans Photos : le geste visé, et le seul qui marche en PWA installée ;
 * 2. sinon **téléchargement d'un blob de même origine** (ordinateur).
 * Fermer la feuille de partage (`AbortError`) est un refus, pas une panne : rien n'est téléchargé à la
 * place. Un échec de récupération REMONTE : aucun `window.open` après un `await` (Safari le bloque).
 */
export async function saveMedia(item: MediaItem, fileName: string, env: SaveEnvironment): Promise<SaveOutcome> {
  let blob: Blob;
  try {
    const response = await env.fetch(item.url, { mode: "cors", cache: "no-store" });
    if (!response.ok) throw new Error(String(response.status));
    blob = await response.blob();
  } catch {
    throw new Error(SAVE_FAILED_MESSAGE);
  }

  const type = blob.type || "image/webp";
  const extension = type.includes("png") ? "png" : type.includes("jpeg") ? "jpg" : "webp";
  const file = new File([blob], `${fileName}.${extension}`, { type });

  const nav = env.navigator;
  if (nav?.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: fileName });
      return "shared";
    } catch (cause) {
      // DOMException n'hérite pas d'Error sur tous les moteurs : on lit le nom.
      if ((cause as { name?: unknown } | null)?.name === "AbortError") return "cancelled";
      // Partage refusé par le système : repli sur le téléchargement.
    }
  }
  env.download(blob, file.name);
  return "downloaded";
}

function canShareFiles(): boolean {
  return typeof navigator !== "undefined" && typeof (navigator as { canShare?: unknown }).canShare === "function";
}

/**
 * Galerie de visuels : voir, récupérer, ranger, retirer (05 §3.2 ; 06 E16 zone 7, PC-13).
 *
 * Brique neutre : elle ne sait rien des parfums, le métier arrive par `fileNameFor` et les rappels.
 * Grille de 3 vignettes au ratio 9:16 ; tap → visionneuse plein écran, portalisée vers `<body>` (une
 * sheet ouverte transforme le conteneur de l'app : un `fixed` s'y ancrerait), bande `modal`.
 *
 * Portage : la visionneuse ne porte pas `.admin-theme` — elle y prenait `color: var(--admin-text)`,
 * texte presque noir sur fond noir, et « Retirer » était invisible. Ses couleurs passent par les jetons
 * `--admin-viewer-backdrop` et `--admin-on-accent`, son empilement par `--admin-z-modal`.
 */
export function MediaGallery({
  items,
  fileNameFor,
  onAdd,
  onDelete,
  onMove,
  onLabel,
  busy = false,
  readOnly = false,
  emptyHint,
  addLabel = "Ajouter des visuels",
}: MediaGalleryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const openedFrom = useRef<HTMLElement | null>(null);

  const index = openId === null ? -1 : items.findIndex((item) => item.id === openId);
  const preview = index >= 0 ? (items[index] ?? null) : null;

  const close = () => {
    setOpenId(null);
    openedFrom.current?.focus();
  };

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 ? (
        <p className="admin-type-caption text-[var(--admin-text-muted)]">{emptyHint ?? "Aucun visuel pour l'instant."}</p>
      ) : (
        <ul className="grid grid-cols-3 gap-2" aria-label="Visuels">
          {items.map((item, position) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={(event) => {
                  openedFrom.current = event.currentTarget;
                  setOpenId(item.id);
                }}
                aria-label={`Ouvrir ${item.label ?? `le visuel ${position + 1}`}`}
                className={cn(
                  "tap-scale relative block aspect-[9/16] w-full overflow-hidden rounded-[var(--admin-radius-md)]",
                  "border border-[var(--admin-border)] bg-[var(--admin-surface-muted)]",
                  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- vignette d'un objet du stockage, telle quelle */}
                <img src={item.url} alt={item.label ?? ""} loading="lazy" decoding="async" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!readOnly && onAdd ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.heic,.heif"
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            data-media-input
            onChange={(event) => {
              const files = event.target.files ? Array.from(event.target.files) : [];
              if (files.length > 0) onAdd(files);
              // Remis à zéro : re-choisir le MÊME fichier après un échec redéclenche `change`.
              event.target.value = "";
            }}
          />
          <Button
            variant="secondary"
            fullWidth
            isLoading={busy}
            leadingIcon={<ImagePlus size={16} />}
            onClick={() => inputRef.current?.click()}
          >
            {addLabel}
          </Button>
        </>
      ) : null}

      {preview ? (
        <MediaViewer
          key={preview.id}
          item={preview}
          position={index}
          count={items.length}
          fileName={fileNameFor(preview)}
          onClose={close}
          onDelete={
            !readOnly && onDelete
              ? () => {
                  setOpenId(null);
                  onDelete(preview);
                }
              : undefined
          }
          onMove={!readOnly && onMove ? (direction) => onMove(preview, direction) : undefined}
          onLabel={!readOnly && onLabel ? (label) => onLabel(preview, label) : undefined}
        />
      ) : null}
    </div>
  );
}

type MediaViewerProps = {
  item: MediaItem;
  position: number;
  count: number;
  fileName: string;
  onClose: () => void;
  onDelete?: () => void;
  onMove?: (direction: -1 | 1) => void;
  onLabel?: (label: string) => Promise<void>;
};

const onViewer = "text-[var(--admin-on-accent)]";

function MediaViewer({ item, position, count, fileName, onClose, onDelete, onMove, onLabel }: MediaViewerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.label ?? "");
  const [labelError, setLabelError] = useState<string | null>(null);
  const [labelBusy, setLabelBusy] = useState(false);
  const share = canShareFiles();

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (mounted) closeRef.current?.focus();
  }, [mounted]);

  // Échap ferme la visionneuse (clavier physique) : `aria-modal` promet une sortie au clavier.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !editing) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, onClose]);

  if (!mounted) return null;

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await saveMedia(item, fileName, { fetch: window.fetch.bind(window), navigator, download: downloadBlob });
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : SAVE_FAILED_MESSAGE);
    } finally {
      setSaving(false);
    }
  };

  const submitLabel = async () => {
    if (!onLabel) return;
    setLabelBusy(true);
    setLabelError(null);
    try {
      await onLabel(draft.trim());
      setEditing(false);
    } catch (cause) {
      setLabelError(cause instanceof Error ? cause.message : "Libellé non enregistré. Réessaie.");
    } finally {
      setLabelBusy(false);
    }
  };

  const title = item.label ?? `Visuel ${position + 1} sur ${count}`;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-media-viewer
      className={cn(
        "fixed inset-0 z-[var(--admin-z-modal)] mx-auto flex max-w-[var(--admin-app-max-width)] flex-col",
        "bg-[var(--admin-viewer-backdrop)] [font-family:var(--admin-font-sans)]",
        onViewer,
      )}
    >
      <div className="flex items-center gap-1 px-2" style={{ paddingTop: "max(var(--admin-space-2), env(safe-area-inset-top))" }}>
        <Button ref={closeRef} variant="ghost" iconOnly ariaLabel="Fermer" onClick={onClose} className={onViewer}>
          <X size={22} />
        </Button>
        {editing ? (
          <form
            className="flex min-w-0 flex-1 items-center gap-1"
            onSubmit={(event) => {
              event.preventDefault();
              void submitLabel();
            }}
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={80}
              autoFocus
              enterKeyHint="done"
              placeholder="Story 9:16, fond clair…"
              aria-label="Libellé du visuel"
              className={cn(
                "admin-type-field min-h-[var(--admin-touch-min)] min-w-0 flex-1 rounded-[var(--admin-radius-md)] px-3",
                "bg-[var(--admin-surface)] text-[var(--admin-text)] placeholder:text-[var(--admin-text-subtle)]",
                "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
              )}
            />
            <Button type="submit" variant="ghost" iconOnly ariaLabel="Enregistrer le libellé" isLoading={labelBusy} className={onViewer}>
              <Check size={20} />
            </Button>
          </form>
        ) : (
          <>
            <p id={titleId} className="admin-type-body min-w-0 flex-1 truncate text-center font-medium">
              {title}
            </p>
            {onLabel ? (
              <Button
                variant="ghost"
                iconOnly
                ariaLabel="Modifier le libellé"
                className={onViewer}
                onClick={() => {
                  setDraft(item.label ?? "");
                  setLabelError(null);
                  setEditing(true);
                }}
              >
                <Pencil size={18} />
              </Button>
            ) : (
              <span className="w-[var(--admin-touch-min)] shrink-0" aria-hidden />
            )}
          </>
        )}
      </div>
      {editing ? (
        <p id={titleId} className="sr-only">
          {title}
        </p>
      ) : null}
      {labelError ? (
        <p role="alert" className="admin-type-caption px-4 pt-1 font-medium">
          {labelError}
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1 items-center justify-center px-3 py-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- le fichier tel qu'il sera partagé, jamais rogné */}
        <img src={item.url} alt={item.label ?? ""} className="max-h-full max-w-full object-contain" />
      </div>

      <div className="flex flex-col gap-2 px-4 pt-2" style={{ paddingBottom: "max(var(--admin-space-4), env(safe-area-inset-bottom))" }}>
        {saveError ? (
          <p role="alert" className="admin-type-caption font-medium">
            {saveError}{" "}
            {/* Un lien réel, toujours actionnable — appui long compris. */}
            <a href={item.url} target="_blank" rel="noopener" className="admin-hit-target underline underline-offset-2">
              Ouvrir dans un onglet
            </a>
          </p>
        ) : null}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          isLoading={saving}
          leadingIcon={share ? <Share2 size={18} /> : <Download size={18} />}
          onClick={() => void save()}
        >
          {share ? "Partager / Enregistrer" : "Télécharger"}
        </Button>
        {onMove || onDelete ? (
          <div className="flex items-center gap-1">
            {onMove ? (
              <>
                <Button
                  variant="ghost"
                  leadingIcon={<ArrowLeft size={16} />}
                  disabled={position === 0}
                  onClick={() => onMove(-1)}
                  className={cn("flex-1", onViewer)}
                >
                  Avant
                </Button>
                <Button
                  variant="ghost"
                  trailingIcon={<ArrowRight size={16} />}
                  disabled={position >= count - 1}
                  onClick={() => onMove(1)}
                  className={cn("flex-1", onViewer)}
                >
                  Après
                </Button>
              </>
            ) : null}
            {onDelete ? (
              <Button variant="ghost" leadingIcon={<Trash2 size={16} />} onClick={onDelete} className={cn("flex-1", onViewer)}>
                Retirer
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
