"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Plus, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet } from "@/ui/primitives/Sheet";
import { Button } from "@/ui/primitives/Button";
import type { CustomerSearchRow } from "@/server/customers/queries";
import { createCustomerAction } from "@/server/customers/actions";

export type SelectedCustomer = {
  id: string;
  fullName: string;
  phoneE164?: string | null;
};

type CustomerComboboxProps = {
  value: SelectedCustomer | null;
  onChange: (customer: SelectedCustomer | null) => void;
  placeholder?: string;
  /** Lance la création inline en arrière-plan (server action). Defaut true. */
  allowInlineCreate?: boolean;
  /** Désactive le widget. */
  disabled?: boolean;
};

type Status = "idle" | "loading" | "creating";

const DEBOUNCE_MS = 220;

async function fetchSearch(q: string): Promise<CustomerSearchRow[]> {
  const r = await fetch(`/api/admin/customers/search?q=${encodeURIComponent(q)}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!r.ok) return [];
  const json: unknown = await r.json();
  if (
    typeof json === "object" &&
    json !== null &&
    "rows" in json &&
    Array.isArray((json as { rows: unknown }).rows)
  ) {
    return (json as { rows: CustomerSearchRow[] }).rows;
  }
  return [];
}

export function CustomerCombobox({
  value,
  onChange,
  placeholder = "Rechercher ou créer un client…",
  allowInlineCreate = true,
  disabled = false,
}: CustomerComboboxProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<CustomerSearchRow[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    if (q.trim().length === 0) {
      setRows([]);
      setStatus("idle");
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setStatus("loading");
    debounceRef.current = setTimeout(() => {
      void fetchSearch(q.trim()).then((found) => {
        setRows(found);
        setStatus("idle");
      });
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, open]);

  // Réinitialise l'état et focus l'input après l'animation d'ouverture de la Sheet
  useEffect(() => {
    if (!open) {
      setQ("");
      setRows([]);
      setStatus("idle");
      setError(null);
      return;
    }
    const t = window.setTimeout(() => searchRef.current?.focus(), 280);
    return () => window.clearTimeout(t);
  }, [open]);

  const exactMatch = rows.find((r) => r.fullName.toLowerCase() === q.trim().toLowerCase());
  const canCreateInline = allowInlineCreate && q.trim().length >= 2 && !exactMatch;

  const select = (c: SelectedCustomer) => {
    onChange(c);
    setOpen(false);
  };

  const createInline = useCallback(async () => {
    const name = q.trim();
    if (name.length < 2) return;
    setStatus("creating");
    setError(null);
    try {
      const result = await createCustomerAction({
        fullName: name,
        phoneE164: null,
        snapchat: null,
        whatsappE164: null,
        address: null,
        notes: null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      select({ id: result.data.id, fullName: result.data.fullName, phoneE164: null });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Création impossible.");
    } finally {
      setStatus("idle");
    }
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const footer = canCreateInline ? (
    <Button
      type="button"
      variant="primary"
      size="lg"
      fullWidth
      leadingIcon={<Plus size={16} />}
      onClick={() => void createInline()}
      disabled={status === "creating"}
    >
      {status === "creating" ? "Création…" : `Créer « ${q.trim()} »`}
    </Button>
  ) : undefined;

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { if (!disabled) setOpen(true); }}
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
          <UserRound size={16} className="shrink-0 text-[var(--admin-text-subtle)]" aria-hidden />
          <span className={cn("truncate", value ? "text-[var(--admin-text)]" : "text-[var(--admin-text-subtle)]")}>
            {value ? value.fullName : placeholder}
          </span>
        </span>
        <ChevronsUpDown size={16} className="shrink-0 text-[var(--admin-text-subtle)]" aria-hidden />
      </button>

      {/* Sheet picker — même pattern que PerfumePicker, pas de dropdown absolu */}
      <Sheet open={open} onOpenChange={setOpen} title="Client" footer={footer}>
        <>
          {/* Input sticky en haut — visible même avec le clavier ouvert */}
          <div
            className="sticky top-0 z-10 -mx-4 bg-[var(--admin-surface)] px-4 pb-3"
            style={{ borderBottom: "1px solid var(--admin-border)" }}
          >
            <input
              ref={searchRef}
              type="search"
              inputMode="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nom ou téléphone…"
              className="w-full rounded-[10px] bg-[var(--admin-surface-muted)] px-3 py-2.5 text-[14px] text-[var(--admin-text)] placeholder:text-[var(--admin-text-subtle)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent-ring)]"
              style={{ border: "1px solid var(--admin-border)" }}
              autoComplete="off"
              enterKeyHint="search"
            />
          </div>

          {/* Résultats scrollables */}
          <div className="space-y-1.5 pt-3">
            {status === "loading" ? (
              <p className="px-1 py-2 text-[13px] text-[var(--admin-text-subtle)]">Recherche…</p>
            ) : null}

            {status === "idle" && q.trim().length === 0 ? (
              <p className="px-1 py-2 text-[13px] text-[var(--admin-text-subtle)]">
                Commence à taper pour rechercher…
              </p>
            ) : null}

            {status === "idle" && q.trim().length > 0 && rows.length === 0 ? (
              <p className="px-1 py-2 text-[13px] text-[var(--admin-text-subtle)]">
                {canCreateInline
                  ? "Aucun client trouvé · utilise « Créer » en bas."
                  : "Aucun client trouvé."}
              </p>
            ) : null}

            {rows.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => select({ id: r.id, fullName: r.fullName, phoneE164: r.phoneE164 })}
                className="flex w-full items-center justify-between gap-2 rounded-[12px] bg-[var(--admin-surface)] px-3 py-2.5 text-left tap-scale active:bg-[var(--admin-surface-muted)]"
                style={{
                  border: `1px solid ${value?.id === r.id ? "var(--admin-accent)" : "var(--admin-border)"}`,
                }}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-[var(--admin-text)]">
                    {r.fullName}
                  </span>
                  {r.phoneE164 ? (
                    <span className="block text-[11px] text-[var(--admin-text-subtle)]">
                      {r.phoneE164}
                    </span>
                  ) : null}
                </span>
                {value?.id === r.id ? (
                  <Check size={14} className="shrink-0 text-[var(--admin-accent)]" />
                ) : null}
              </button>
            ))}

            {error ? (
              <div
                className="rounded-[10px] px-3 py-2 text-[12px] text-[var(--admin-danger)]"
                style={{ background: "var(--admin-danger-bg)" }}
              >
                {error}
              </div>
            ) : null}
          </div>
        </>
      </Sheet>
    </>
  );
}
