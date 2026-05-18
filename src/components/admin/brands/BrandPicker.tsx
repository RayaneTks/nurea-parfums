"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Plus, Search, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet } from "@/ui/primitives/Sheet";
import { Button } from "@/ui/primitives/Button";

export type SelectedBrand = {
  id: string;
  name: string;
};

type BrandRow = {
  id: string;
  name: string;
  slug: string;
};

type BrandPickerProps = {
  value: SelectedBrand | null;
  onChange: (brand: SelectedBrand | null) => void;
  placeholder?: string;
  /** Permet la création inline d'une marque hors catalogue (statut DRAFT). */
  allowInlineCreate?: boolean;
  disabled?: boolean;
  /** Si rendu à l'intérieur d'un autre Sheet (cas PerfumePicker). */
  nested?: boolean;
};

type Status = "idle" | "loading" | "creating";

async function fetchBrands(): Promise<BrandRow[]> {
  const r = await fetch("/api/admin/brands", {
    credentials: "include",
    cache: "no-store",
  });
  if (!r.ok) return [];
  const json: unknown = await r.json();
  if (
    typeof json === "object" &&
    json !== null &&
    "brands" in json &&
    Array.isArray((json as { brands: unknown }).brands)
  ) {
    return (json as { brands: BrandRow[] }).brands.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
    }));
  }
  return [];
}

async function createBrand(name: string): Promise<BrandRow | { error: string }> {
  const r = await fetch("/api/admin/brands", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      catalogMode: "CURATED",
      status: "DRAFT",
    }),
  });
  const json: unknown = await r.json().catch(() => ({}));
  if (!r.ok) {
    const error =
      typeof json === "object" && json !== null && "error" in json
        ? String((json as { error: unknown }).error)
        : "Création impossible.";
    return { error };
  }
  if (
    typeof json === "object" &&
    json !== null &&
    "brand" in json &&
    typeof (json as { brand: unknown }).brand === "object"
  ) {
    const b = (json as { brand: BrandRow }).brand;
    return { id: b.id, name: b.name, slug: b.slug };
  }
  return { error: "Réponse invalide." };
}

export function BrandPicker({
  value,
  onChange,
  placeholder = "Choisir une marque…",
  allowInlineCreate = true,
  disabled = false,
  nested = false,
}: BrandPickerProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      setQ("");
      setError(null);
      return;
    }
    setStatus("loading");
    void fetchBrands().then((rows) => {
      setBrands(rows);
      setStatus("idle");
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 280);
    return () => clearTimeout(t);
  }, [open]);

  const query = q.trim().toLowerCase();
  const filtered = brands.filter((b) =>
    query.length === 0 ? true : b.name.toLowerCase().includes(query),
  );
  const exactMatch = brands.find((b) => b.name.toLowerCase() === query);
  const canCreateInline = allowInlineCreate && query.length >= 2 && !exactMatch;

  const select = useCallback(
    (b: SelectedBrand) => {
      onChange(b);
      setOpen(false);
    },
    [onChange],
  );

  const createInline = useCallback(async () => {
    const name = q.trim();
    if (name.length < 2) return;
    setStatus("creating");
    setError(null);
    const result = await createBrand(name);
    setStatus("idle");
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setBrands((prev) => [...prev, result].sort((a, b) => a.name.localeCompare(b.name)));
    select({ id: result.id, name: result.name });
  }, [q, select]);

  const footer = canCreateInline ? (
    <Button
      type="button"
      variant="primary"
      size="lg"
      fullWidth
      leadingIcon={<Plus size={16} />}
      onClick={() => void createInline()}
      isLoading={status === "creating"}
    >
      {status === "creating" ? "Création…" : `Créer la marque « ${q.trim()} »`}
    </Button>
  ) : undefined;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          setOpen(true);
        }}
        disabled={disabled}
        className={cn(
          "flex w-full min-h-[44px] items-center justify-between gap-2 rounded-[12px] px-4 py-2.5 text-left text-[14px] tap-scale focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
          "border border-[var(--admin-border-strong)] bg-[var(--admin-surface)]",
          disabled && "opacity-60",
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <Tag size={16} className="shrink-0 text-[var(--admin-text-subtle)]" aria-hidden />
          <span
            className={cn(
              "truncate",
              value ? "text-[var(--admin-text)]" : "text-[var(--admin-text-subtle)]",
            )}
          >
            {value ? value.name : placeholder}
          </span>
        </span>
        <ChevronsUpDown size={16} className="shrink-0 text-[var(--admin-text-subtle)]" aria-hidden />
      </button>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Choisir une marque"
        maxVh={92}
        footer={footer}
        nested={nested}
      >
        <>
          <div
            className="sticky top-0 z-10 -mx-4 bg-[var(--admin-surface)] px-4 pb-3"
            style={{ borderBottom: "1px solid var(--admin-border)" }}
          >
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-subtle)] pointer-events-none"
                aria-hidden
              />
              <input
                ref={inputRef}
                type="search"
                inputMode="search"
                enterKeyHint="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                placeholder="Rechercher une marque…"
                autoComplete="off"
                className="w-full rounded-[10px] bg-[var(--admin-surface-muted)] pl-9 pr-3 py-2.5 text-[14px] text-[var(--admin-text)] placeholder:text-[var(--admin-text-subtle)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent-ring)]"
                style={{ border: "1px solid var(--admin-border)" }}
              />
            </div>
          </div>

          <ul className="space-y-1.5 pt-3" role="listbox">
            {status === "loading" ? (
              <li className="px-2 py-3 text-center text-[13px] text-[var(--admin-text-subtle)]">
                Chargement…
              </li>
            ) : null}
            {status === "idle" && filtered.length === 0 && query.length > 0 ? (
              <li className="px-2 py-6 text-center text-[13px] text-[var(--admin-text-subtle)]">
                Aucune marque trouvée.
                {canCreateInline ? " Tape « Créer » ci-dessous." : ""}
              </li>
            ) : null}
            {status === "idle" && filtered.length === 0 && query.length === 0 ? (
              <li className="px-2 py-6 text-center text-[13px] text-[var(--admin-text-subtle)]">
                Aucune marque. Tape un nom pour en créer une.
              </li>
            ) : null}
            {filtered.map((b) => (
              <li key={b.id} role="option" aria-selected={value?.id === b.id}>
                <button
                  type="button"
                  onClick={() => select({ id: b.id, name: b.name })}
                  className="flex w-full items-center justify-between gap-2 rounded-[12px] bg-[var(--admin-surface)] px-3 py-2.5 text-left tap-scale active:bg-[var(--admin-surface-muted)]"
                  style={{ border: "1px solid var(--admin-border)" }}
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <Tag
                      size={16}
                      className="shrink-0 text-[var(--admin-text-subtle)]"
                      aria-hidden
                    />
                    <span className="block truncate text-[14px] font-medium text-[var(--admin-text)]">
                      {b.name}
                    </span>
                  </span>
                  {value?.id === b.id ? (
                    <Check size={16} className="shrink-0 text-[var(--admin-accent)]" />
                  ) : null}
                </button>
              </li>
            ))}
          </ul>

          {error ? (
            <div
              className="mt-3 rounded-[10px] px-3 py-2 text-[12px] text-[var(--admin-danger)]"
              style={{ background: "var(--admin-danger-bg)" }}
            >
              {error}
            </div>
          ) : null}
        </>
      </Sheet>
    </>
  );
}
