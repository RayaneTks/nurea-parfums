"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { Sheet } from "@/ui/primitives/Sheet";
import { Input } from "@/ui/primitives/Input";
import { Button } from "@/ui/primitives/Button";
import { Stack } from "@/ui/primitives/Stack";
import { Skeleton } from "@/ui/primitives/Skeleton";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { SegmentedControl } from "@/ui/primitives/SegmentedControl";
import { cn } from "@/lib/utils";
import type { PerfumePickerRow } from "@/lib/gestion/types";

let pickerCache: PerfumePickerRow[] | null = null;

type BrandRow = { id: string; name: string };
let brandsCache: BrandRow[] | null = null;

/**
 * Combobox marque : autocomplétion sur les marques existantes + création
 * inline. Aligné sur le pattern CustomerCombobox / BrandCombobox du
 * formulaire perfume.
 */
function BrandAutocomplete({
  value,
  onChange,
  onCreate,
  onEnter,
}: {
  value: string;
  onChange: (name: string) => void;
  onCreate: (newName: string) => void;
  /** Appelé si Enter pressé et dropdown fermé (ou pas d'action contextuelle). */
  onEnter?: () => void;
}) {
  const [brands, setBrands] = useState<BrandRow[]>(brandsCache ?? []);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (brandsCache) return;
    fetch("/api/admin/brands", { credentials: "include", cache: "no-store" })
      .then((r) => r.json() as Promise<{ brands?: BrandRow[] }>)
      .then((j) => {
        const next = j.brands ?? [];
        brandsCache = next;
        setBrands(next);
      })
      .catch(() => {
        /* silencieux — la création reste possible */
      });
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const q = value.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (q.length === 0) return brands.slice(0, 8);
    return brands.filter((b) => b.name.toLowerCase().includes(q)).slice(0, 12);
  }, [brands, q]);

  const exactMatch = useMemo(
    () => brands.some((b) => b.name.toLowerCase() === q),
    [brands, q],
  );
  const canCreate = q.length >= 2 && !exactMatch;

  const handleCreate = async () => {
    const name = value.trim();
    if (name.length < 2) return;
    setCreating(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/brands", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const j = (await r.json()) as { error?: string; brand?: BrandRow };
      if (!r.ok || !j.brand) throw new Error(j.error ?? "Création échouée");
      const next = [...brands, j.brand].sort((a, z) =>
        a.name.localeCompare(z.name),
      );
      brandsCache = next;
      setBrands(next);
      onCreate(j.brand.name);
      onChange(j.brand.name);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        label="Marque"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          if (canCreate) {
            void handleCreate();
          } else if (open && filtered.length === 1) {
            /* Une seule suggestion → la sélectionne */
            const only = filtered[0];
            if (only) {
              onChange(only.name);
              setOpen(false);
            }
          } else {
            setOpen(false);
            onEnter?.();
          }
        }}
        placeholder="Creed"
        variant="elevated"
        enterKeyHint="done"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />

      {open && (filtered.length > 0 || canCreate) ? (
        <div
          className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-lg"
          role="listbox"
        >
          {canCreate ? (
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={creating}
              className={cn(
                "flex w-full items-center gap-2 border-b border-[var(--admin-border)] px-3 py-3 text-left text-[13px] font-medium tap-scale",
                "bg-[var(--admin-accent-bg)] text-[var(--admin-accent)]",
                "[@media(hover:hover)]:hover:bg-[var(--admin-accent)] [@media(hover:hover)]:hover:text-white",
                "disabled:opacity-60",
              )}
            >
              {creating ? (
                <Loader2 size={16} className="animate-spin" aria-hidden />
              ) : (
                <Plus size={16} className="shrink-0" aria-hidden />
              )}
              <span className="truncate">
                Ajouter la marque «&nbsp;{value.trim()}&nbsp;»
              </span>
            </button>
          ) : null}

          {filtered.length > 0 ? (
            <ul className="max-h-56 overflow-y-auto py-1">
              {filtered.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(b.name);
                      setOpen(false);
                    }}
                    className="flex w-full items-center justify-between px-3 py-2.5 text-left text-[14px] text-[var(--admin-text)] tap-scale [@media(hover:hover)]:hover:bg-[var(--admin-surface-muted)]"
                    role="option"
                    aria-selected={value.trim().toLowerCase() === b.name.toLowerCase()}
                  >
                    <span className="truncate">{b.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="mt-1.5 text-[12px] text-[var(--admin-danger)]">{error}</p>
      ) : null}
    </div>
  );
}

export type PickerResult =
  | { kind: "catalog"; perfume: PerfumePickerRow }
  | { kind: "manual"; name: string; brandName: string };

type PerfumePickerProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (result: PickerResult) => void;
  excludedIds?: number[];
  /** Désactive l'onglet manuel (utile si feature pas encore supportée par le contexte). */
  allowManual?: boolean;
};

type Mode = "catalog" | "manual";

const MODE_OPTIONS = [
  { value: "catalog" as const, label: "Catalogue" },
  { value: "manual" as const, label: "Saisie libre" },
];

export function PerfumePicker({
  open,
  onClose,
  onSelect,
  excludedIds = [],
  allowManual = true,
}: PerfumePickerProps) {
  const [mode, setMode] = useState<Mode>("catalog");
  const [perfumes, setPerfumes] = useState<PerfumePickerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualBrand, setManualBrand] = useState("");
  const catalogSearchRef = useRef<HTMLInputElement>(null);
  const manualNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (pickerCache) {
      setPerfumes(pickerCache);
      return;
    }
    setLoading(true);
    fetch("/api/admin/catalogue?mode=picker", {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Catalogue indisponible.");
        return (await r.json()) as { perfumes: PerfumePickerRow[] };
      })
      .then((data) => {
        const next = data.perfumes ?? [];
        pickerCache = next;
        setPerfumes(next);
      })
      .catch(() => setPerfumes([]))
      .finally(() => setLoading(false));
  }, [open]);

  // Reset mode + draft on open / close.
  useEffect(() => {
    if (!open) {
      setMode("catalog");
      setQuery("");
      setManualName("");
      setManualBrand("");
    }
  }, [open]);

  // Focus délayé après animation Sheet (vaul ~260ms) pour éviter race condition
  // qui rendait le champ "invisible" sur mobile (clavier ouvert, focus volé).
  useEffect(() => {
    if (!open) return;
    const target = mode === "catalog" ? catalogSearchRef : manualNameRef;
    const t = window.setTimeout(() => {
      target.current?.focus();
    }, 280);
    return () => window.clearTimeout(t);
  }, [open, mode]);

  const q = query.trim().toLowerCase();
  const filtered = perfumes.filter((p) => {
    if (excludedIds.includes(p.id)) return false;
    if (q.length === 0) return true;
    const hay = `${p.name} ${p.brand?.name ?? ""}`.toLowerCase();
    return hay.includes(q);
  });

  const selectCatalog = (p: PerfumePickerRow) => {
    onSelect({ kind: "catalog", perfume: p });
    onClose();
  };

  const selectManual = () => {
    const name = manualName.trim();
    const brand = manualBrand.trim() || "Hors catalogue";
    if (name.length < 2) return;
    onSelect({ kind: "manual", name, brandName: brand });
    onClose();
  };

  const footer =
    mode === "manual" ? (
      <Button
        type="button"
        variant="primary"
        size="lg"
        fullWidth
        leadingIcon={<Plus size={16} />}
        onClick={selectManual}
        disabled={manualName.trim().length < 2}
      >
        Ajouter en saisie libre
      </Button>
    ) : undefined;

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => (o ? null : onClose())}
      title="Choisir un parfum"
      maxVh={92}
      footer={footer}
    >
      <>
        <div
          className="sticky top-0 z-10 -mx-4 bg-[var(--admin-surface)] px-4 pb-3"
          style={{ borderBottom: "1px solid var(--admin-border)" }}
        >
          {allowManual ? (
            <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={setMode} />
          ) : null}
          {mode === "catalog" ? (
            <div className={allowManual ? "mt-3" : ""}>
              <Input
                ref={catalogSearchRef}
                type="search"
                inputMode="search"
                enterKeyHint="search"
                placeholder="Rechercher dans le catalogue…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                leadingIcon={<Search size={16} />}
                variant="elevated"
              />
            </div>
          ) : (
            <Stack gap={2} className="mt-3">
              <Input
                ref={manualNameRef}
                label="Nom du parfum"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="Aventus"
                variant="elevated"
                enterKeyHint="next"
              />
              <BrandAutocomplete
                value={manualBrand}
                onChange={setManualBrand}
                onCreate={(name) => setManualBrand(name)}
                onEnter={selectManual}
              />
            </Stack>
          )}
        </div>

        <div className="pt-3">
          {mode === "catalog" ? (
            loading ? (
              <Stack gap={2}>
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} height={56} />
                ))}
              </Stack>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Search}
                title="Aucun parfum"
                description={
                  q.length > 0
                    ? "Essaie un autre nom ou crée en saisie libre."
                    : "Aucun parfum disponible."
                }
              />
            ) : (
              <ul className="space-y-1.5">
                {filtered.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => selectCatalog(p)}
                      className="flex w-full items-center gap-3 rounded-[12px] bg-[var(--admin-surface)] px-3 py-2.5 text-left tap-scale active:bg-[var(--admin-surface-muted)]"
                      style={{ border: "1px solid var(--admin-border)" }}
                    >
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[8px] bg-[var(--admin-surface-muted)]">
                        {p.image ? (
                          <Image src={p.image} alt="" fill sizes="40px" className="object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium leading-tight text-[var(--admin-text)]">
                          {p.name}
                        </p>
                        <p className="truncate text-[12px] text-[var(--admin-text-subtle)] mt-0.5">
                          {p.brand?.name ?? "—"}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <p className="text-[12px] text-[var(--admin-text-muted)]">
              Pour un parfum hors catalogue. Nom + marque gardés en snapshot.
            </p>
          )}
        </div>
      </>
    </Sheet>
  );
}
