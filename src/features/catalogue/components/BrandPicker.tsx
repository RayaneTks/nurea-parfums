"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, Plus } from "lucide-react";
import { Input } from "@/ui/primitives/Input";
import { readJsonSafe } from "@/lib/admin/http";
import { cn } from "@/lib/utils";

export type BrandOption = {
  id: string;
  name: string;
  catalogMode: "CURATED" | "COMPLETE";
  status: "PUBLISHED" | "DRAFT";
  image: string | null;
};

type BrandPickerProps = {
  brands: readonly BrandOption[];
  value: string;
  onSelect: (brand: BrandOption) => void;
  onClear: () => void;
  onBrandCreated: (brand: BrandOption) => void;
  onError: (message: string) => void;
  readOnly?: boolean;
};

/** Longueur minimale d'un nom de marque acceptée par l'API. */
const MIN_NAME_LENGTH = 2;

/**
 * Sélecteur de marque avec création à la volée.
 *
 * L'entrée « Ajouter la marque … » reste en tête de liste : sur iPhone, le
 * clavier recouvre le bas de la popover et une action placée après les
 * résultats devient inatteignable.
 */
export function BrandPicker({
  brands,
  value,
  onSelect,
  onClear,
  onBrandCreated,
  onError,
  readOnly = false,
}: BrandPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => brands.find((b) => b.id === value), [brands, value]);
  const trimmed = query.trim();

  const results = useMemo(() => {
    const q = trimmed.toLowerCase();
    if (!q) return brands.slice(0, 8);
    return brands.filter((b) => b.name.toLowerCase().includes(q)).slice(0, 20);
  }, [brands, trimmed]);

  const hasExactMatch = useMemo(
    () => brands.some((b) => b.name.toLowerCase() === trimmed.toLowerCase()),
    [brands, trimmed],
  );

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function createBrand() {
    if (trimmed.length < MIN_NAME_LENGTH || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/brands", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const json = await readJsonSafe<{ error?: string; brand?: BrandOption }>(res);
      if (!res.ok || !json?.brand) {
        throw new Error(json?.error ?? "La marque n'a pas pu être créée.");
      }
      onBrandCreated(json.brand);
      onSelect(json.brand);
      setQuery("");
      setOpen(false);
    } catch (e) {
      onError(e instanceof Error ? e.message : "La marque n'a pas pu être créée.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        label="Marque"
        value={open ? query : selected?.name ?? ""}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        disabled={readOnly}
        placeholder="Rechercher ou créer une marque…"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        disableAutoScroll
        trailingSlot={
          selected && !readOnly && !open ? (
            <button
              type="button"
              onClick={onClear}
              aria-label="Changer de marque"
              className="inline-flex h-8 items-center rounded-full px-2.5 text-[12px] font-medium text-[var(--admin-accent)] tap-scale hover:bg-[var(--admin-accent-bg)]"
            >
              Changer
            </button>
          ) : undefined
        }
      />

      {open ? (
        <div
          role="listbox"
          aria-label="Marques"
          className="absolute inset-x-0 top-full z-30 mt-1.5 overflow-hidden rounded-[14px] bg-[var(--admin-surface)] shadow-[var(--admin-shadow-lg)]"
          style={{ border: "1px solid var(--admin-border-strong)" }}
        >
          {trimmed.length >= MIN_NAME_LENGTH && !hasExactMatch ? (
            <button
              type="button"
              onClick={() => void createBrand()}
              disabled={creating}
              className={cn(
                "flex w-full min-h-[var(--admin-touch-min)] items-center gap-2.5 px-3 py-3 text-left",
                "bg-[var(--admin-accent-bg)] text-[var(--admin-accent)] tap-scale",
                "disabled:opacity-60",
              )}
              style={{ borderBottom: "1px solid var(--admin-border)" }}
            >
              {creating ? (
                <Loader2 size={16} className="shrink-0 animate-spin" aria-hidden />
              ) : (
                <Plus size={16} className="shrink-0" aria-hidden />
              )}
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">
                Créer la marque « {trimmed} »
              </span>
            </button>
          ) : null}

          <div className="max-h-[240px] overflow-y-auto overscroll-contain">
            {results.length > 0 ? (
              results.map((brand) => {
                const active = brand.id === value;
                return (
                  <button
                    key={brand.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onSelect(brand);
                      setQuery("");
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full min-h-[var(--admin-touch-min)] items-center gap-2 px-3 py-2.5 text-left",
                      "tap-scale hover:bg-[var(--admin-surface-muted)]",
                      active ? "bg-[var(--admin-accent-bg)]" : null,
                    )}
                  >
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-[15px]",
                        active
                          ? "font-semibold text-[var(--admin-accent)]"
                          : "text-[var(--admin-text)]",
                      )}
                    >
                      {brand.name}
                    </span>
                    {brand.catalogMode === "COMPLETE" ? (
                      <span className="shrink-0 text-[11px] text-[var(--admin-text-subtle)]">
                        Gamme complète
                      </span>
                    ) : null}
                    {active ? (
                      <Check
                        size={16}
                        className="shrink-0 text-[var(--admin-accent)]"
                        aria-hidden
                      />
                    ) : null}
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-5 text-center text-[13px] text-[var(--admin-text-subtle)]">
                {trimmed.length < MIN_NAME_LENGTH
                  ? "Tape au moins deux lettres."
                  : "Aucune marque ne correspond."}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
