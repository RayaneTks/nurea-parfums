"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Plus, Search, UserRound } from "lucide-react";
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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Champ vide : l'API renvoie les clients les plus actifs. Un sélecteur muet
  // tant qu'on n'a pas tapé oblige à connaître le nom exact et pousse à
  // recréer une fiche existante.
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setStatus("loading");
    const term = q.trim();
    debounceRef.current = setTimeout(
      () => {
        void fetchSearch(term).then((found) => {
          setRows(found);
          setStatus("idle");
        });
      },
      term.length === 0 ? 0 : DEBOUNCE_MS,
    );
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 280);
    return () => clearTimeout(t);
  }, [open]);

  const exactMatch = rows.find((r) => r.fullName.toLowerCase() === q.trim().toLowerCase());
  const canCreateInline = allowInlineCreate && q.trim().length >= 2 && !exactMatch;

  const select = useCallback(
    (c: SelectedCustomer) => {
      onChange(c);
      setQ("");
      setRows([]);
      setOpen(false);
    },
    [onChange],
  );

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
  }, [q, select]);

  // Tant que des fiches correspondent, créer n'est plus l'action attendue :
  // le bouton passe en secondaire pour ne pas éclipser les résultats.
  const hasMatches = rows.length > 0;
  const footer = canCreateInline ? (
    <Button
      type="button"
      variant={hasMatches ? "secondary" : "primary"}
      size="lg"
      fullWidth
      leadingIcon={<Plus size={16} />}
      onClick={() => void createInline()}
      isLoading={status === "creating"}
    >
      {status === "creating" ? "Création…" : `Créer « ${q.trim()} »`}
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
          <UserRound size={16} className="shrink-0 text-[var(--admin-text-subtle)]" aria-hidden />
          <span
            className={cn(
              "truncate",
              value ? "text-[var(--admin-text)]" : "text-[var(--admin-text-subtle)]",
            )}
          >
            {value ? value.fullName : placeholder}
          </span>
        </span>
        <ChevronsUpDown size={16} className="shrink-0 text-[var(--admin-text-subtle)]" aria-hidden />
      </button>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Choisir un client"
        maxVh={92}
        footer={footer}
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
                placeholder={placeholder}
                autoComplete="off"
                className="w-full rounded-[10px] bg-[var(--admin-surface-muted)] pl-9 pr-3 py-2.5 text-[14px] text-[var(--admin-text)] placeholder:text-[var(--admin-text-subtle)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent-ring)]"
                style={{ border: "1px solid var(--admin-border)" }}
              />
            </div>
          </div>

          {hasMatches ? (
            <p className="px-1 pt-3 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--admin-text-muted)]">
              {q.trim().length === 0
                ? "Clients récents"
                : `${rows.length} client${rows.length > 1 ? "s" : ""}`}
            </p>
          ) : null}

          <ul className="space-y-1.5 pt-2" role="listbox">
            {status === "loading" && rows.length === 0 ? (
              <li className="px-2 py-3 text-center text-[13px] text-[var(--admin-text-subtle)]">
                Recherche…
              </li>
            ) : null}
            {status === "idle" && rows.length === 0 ? (
              <li className="px-2 py-6 text-center text-[13px] text-[var(--admin-text-subtle)]">
                {q.trim().length === 0
                  ? "Aucun client enregistré pour l'instant."
                  : `Aucun client ne correspond à « ${q.trim()} ».`}
              </li>
            ) : null}
            {rows.map((r) => (
              <li key={r.id} role="option" aria-selected={value?.id === r.id}>
                <button
                  type="button"
                  onClick={() =>
                    select({ id: r.id, fullName: r.fullName, phoneE164: r.phoneE164 })
                  }
                  className="flex w-full items-center justify-between gap-2 rounded-[12px] bg-[var(--admin-surface)] px-3 py-2.5 text-left tap-scale active:bg-[var(--admin-surface-muted)]"
                  style={{ border: "1px solid var(--admin-border)" }}
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <UserRound
                      size={16}
                      className="shrink-0 text-[var(--admin-text-subtle)]"
                      aria-hidden
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-medium text-[var(--admin-text)]">
                        {r.fullName}
                      </span>
                      {r.phoneE164 ? (
                        <span className="block truncate text-[12px] text-[var(--admin-text-subtle)]">
                          {r.phoneE164}
                        </span>
                      ) : null}
                    </span>
                  </span>
                  {value?.id === r.id ? (
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
