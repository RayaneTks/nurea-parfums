"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Check, ChevronsUpDown, Plus, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const id = useId();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<CustomerSearchRow[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
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

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const el = document.getElementById(`combo-${id}`);
      if (el && !el.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open, id]);

  const exactMatch = rows.find((r) => r.fullName.toLowerCase() === q.trim().toLowerCase());
  const canCreateInline = allowInlineCreate && q.trim().length >= 2 && !exactMatch;

  const select = (c: SelectedCustomer) => {
    onChange(c);
    setQ("");
    setRows([]);
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
  }, [q]);

  return (
    <div id={`combo-${id}`} className="relative">
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          setOpen(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        disabled={disabled}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl border border-neutral-300 bg-white px-3 py-3 text-left text-sm tap-scale focus:outline-none focus-visible:ring-2 focus-visible:ring-nurea-bordeaux/35",
          disabled && "opacity-60",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <UserRound size={16} className="shrink-0 text-neutral-500" aria-hidden />
          <span className={cn("truncate", value ? "text-neutral-900" : "text-neutral-400")}>
            {value ? value.fullName : placeholder}
          </span>
        </span>
        <ChevronsUpDown size={16} className="shrink-0 text-neutral-400" aria-hidden />
      </button>

      {open && !disabled ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg">
          <div className="border-b border-neutral-200 p-2">
            <input
              ref={inputRef}
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nom ou téléphone…"
              className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-nurea-bordeaux/40"
              autoComplete="off"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1" role="listbox">
            {status === "loading" ? (
              <li className="px-3 py-2 text-xs text-neutral-500">Recherche…</li>
            ) : null}
            {status === "idle" && rows.length === 0 && q.trim().length > 0 ? (
              <li className="px-3 py-2 text-xs text-neutral-500">Aucun client trouvé.</li>
            ) : null}
            {rows.map((r) => (
              <li key={r.id} role="option" aria-selected={value?.id === r.id}>
                <button
                  type="button"
                  onClick={() => select({ id: r.id, fullName: r.fullName, phoneE164: r.phoneE164 })}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-nurea-bordeaux/5"
                >
                  <span className="min-w-0">
                    <span className="block truncate">{r.fullName}</span>
                    {r.phoneE164 ? (
                      <span className="block text-xs text-neutral-500">{r.phoneE164}</span>
                    ) : null}
                  </span>
                  {value?.id === r.id ? <Check size={14} className="text-nurea-bordeaux" /> : null}
                </button>
              </li>
            ))}
            {canCreateInline ? (
              <li className="border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => void createInline()}
                  disabled={status === "creating"}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-nurea-bordeaux hover:bg-nurea-bordeaux/5 disabled:opacity-50"
                >
                  <Plus size={14} />
                  <span>
                    {status === "creating" ? "Création…" : `Créer « ${q.trim()} »`}
                  </span>
                </button>
              </li>
            ) : null}
          </ul>
          {error ? (
            <div className="border-t border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
