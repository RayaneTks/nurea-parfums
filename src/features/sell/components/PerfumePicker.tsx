"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Sheet } from "@/ui/primitives/Sheet";
import { Input } from "@/ui/primitives/Input";
import { Button } from "@/ui/primitives/Button";
import { Stack } from "@/ui/primitives/Stack";
import { Skeleton } from "@/ui/primitives/Skeleton";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { SegmentedControl } from "@/ui/primitives/SegmentedControl";
import { BrandPicker, type SelectedBrand } from "@/components/admin/brands/BrandPicker";
import type { PerfumePickerRow } from "@/lib/gestion/types";

export type PickerResult =
  | { kind: "catalog"; perfume: PerfumePickerRow }
  | {
      kind: "manual";
      name: string;
      brandName: string;
      /** ID de la marque catalogue choisie (créée à la volée si nécessaire). */
      brandId: string | null;
    };

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

async function fetchCatalogue(): Promise<PerfumePickerRow[]> {
  const r = await fetch("/api/admin/catalogue?mode=picker", {
    credentials: "include",
    cache: "no-store",
  });
  if (!r.ok) return [];
  const json = (await r.json()) as { perfumes?: PerfumePickerRow[] };
  return json.perfumes ?? [];
}

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
  const [manualBrand, setManualBrand] = useState<SelectedBrand | null>(null);
  const catalogSearchRef = useRef<HTMLInputElement>(null);
  const manualNameRef = useRef<HTMLInputElement>(null);

  // Fetch frais à chaque ouverture (pas de cache module-level :
  // l'ancien `pickerCache` rendait les nouveaux parfums invisibles).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void fetchCatalogue()
      .then((rows) => {
        if (cancelled) return;
        setPerfumes(rows);
      })
      .catch(() => {
        if (cancelled) return;
        setPerfumes([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Reset mode + draft on close.
  useEffect(() => {
    if (!open) {
      setMode("catalog");
      setQuery("");
      setManualName("");
      setManualBrand(null);
    }
  }, [open]);

  // Focus délayé après animation Sheet (vaul ~260ms) pour éviter race condition
  // qui rendait le champ "invisible" sur mobile (clavier ouvert, focus volé).
  useEffect(() => {
    if (!open) return;
    if (mode !== "catalog" && mode !== "manual") return;
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

  const canSubmitManual = manualBrand !== null && manualName.trim().length >= 2;

  const selectManual = () => {
    const name = manualName.trim();
    if (!manualBrand || name.length < 2) return;
    onSelect({
      kind: "manual",
      name,
      brandName: manualBrand.name,
      brandId: manualBrand.id,
    });
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
        disabled={!canSubmitManual}
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
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[var(--admin-text-muted)]">
                  Marque
                </label>
                <BrandPicker
                  value={manualBrand}
                  onChange={setManualBrand}
                  placeholder="Choisir ou créer une marque…"
                  nested
                />
              </div>
              <Input
                ref={manualNameRef}
                label="Nom / référence du parfum"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="Aventus, Royal Oud, n°5…"
                variant="elevated"
                enterKeyHint="done"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (canSubmitManual) selectManual();
                    else e.currentTarget.blur();
                  }
                }}
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
                    ? "Essaie un autre nom ou bascule sur « Saisie libre »."
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
              Pour un parfum hors catalogue : choisis la marque (créée à la volée
              si besoin) et écris la référence. Nom + marque gardés en snapshot.
            </p>
          )}
        </div>
      </>
    </Sheet>
  );
}
