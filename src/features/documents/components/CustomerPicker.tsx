"use client";

import { UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useToast } from "@/app-shell/FeedbackProvider";
import { isNavigable, routes } from "@/app-shell/routes";
import { useAction } from "@/app-shell/hooks/useAction";
import { useReadRoute } from "@/app-shell/hooks/useReadRoute";
import type { ComposerCustomerDTO } from "@/contracts/documents";
import type { SearchResultsDTO } from "@/contracts/search";
import { newId } from "@/domain/ids";
import { eurFromWire, formatEur } from "@/domain/money";
import { formatPhoneNational } from "@/domain/phone";
import { cleNom } from "@/lib/nommage";
import { createCustomerAction } from "@/server/customers/actions";
import { FormField } from "@/ui/patterns/FormField";
import { SelectSheet, type SelectCreateContext, type SelectOption } from "@/ui/patterns/SelectSheet";
import { Avatar } from "@/ui/primitives/Avatar";
import { Badge } from "@/ui/primitives/Badge";
import { Button } from "@/ui/primitives/Button";
import { Card } from "@/ui/primitives/Card";
import { Input } from "@/ui/primitives/Input";
import { ListRow } from "@/ui/primitives/ListRow";
import { Text } from "@/ui/primitives/Text";

type CustomerPickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** La fiche choisie, avec de quoi l'afficher tout de suite (nom, contact en légende). */
  onSelect: (customerId: string, customer: ComposerCustomerDTO | null) => void;
  nested?: boolean;
  /** « Lier une fiche » (S01). */
  title?: string;
};

/** URL de la route de lecture (04 §3.5) : pas une adresse d'écran, elle ne vit pas dans `routes.ts`. */
const searchUrl = (q: string) => `/api/admin/search?scope=customers&q=${encodeURIComponent(q)}`;

/**
 * S06 — Sélecteur de client : récents (8 clients au document le plus récent), recherche à la frappe (nom, téléphone
 * normalisé, Snap, WhatsApp), et S10 — création en ligne avec alerte d'homonyme.
 */
export function CustomerPicker({ open, onOpenChange, onSelect, nested = true, title = "Lier une fiche" }: CustomerPickerProps) {
  const [query, setQuery] = useState("");
  // Fiches créées en ligne (S10) : pas encore dans les résultats de la recherche.
  const created = useRef(new Map<string, ComposerCustomerDTO>());
  const trimmed = query.trim();
  const read = useReadRoute<SearchResultsDTO>(open ? searchUrl(trimmed.length >= 2 ? trimmed : "") : null, { debounceMs: 200 });
  const results = read.data;

  const hits = useMemo(() => (results ? (results.q.length >= 2 ? results.customers.items : results.recentCustomers) : []), [results]);
  const options = useMemo<SelectOption[]>(
    () =>
      hits.map((hit) => ({
        value: hit.id,
        label: hit.fullName,
        description: hit.contact ?? undefined,
        // Résultat du serveur pour cette saisie (téléphone compris) : le filtre local ne doit pas l'écarter.
        keywords: [results?.q ?? ""],
        leading: <Avatar name={hit.fullName} size="md" />,
        trailing: hit.due ? <Badge tone="warning">{formatEur(eurFromWire(hit.due), { compact: true })} dû</Badge> : undefined,
      })),
    [hits, results],
  );

  const detailsOf = (id: string): ComposerCustomerDTO | null => {
    const hit = hits.find((candidate) => candidate.id === id);
    return hit ? { id: hit.id, fullName: hit.fullName, contact: hit.contact } : (created.current.get(id) ?? null);
  };

  const recent = results && results.q.length < 2 ? results.recentCustomers.map((hit) => hit.id) : undefined;

  return (
    <SelectSheet
      open={open}
      onOpenChange={onOpenChange}
      nested={nested}
      title={title}
      options={options}
      onSelect={(id) => onSelect(id, detailsOf(id))}
      recent={recent}
      recentTitle="Récents"
      listAllBeforeSearch={false}
      searchPlaceholder="Nom, téléphone, Snap"
      autoFocusSearch
      query={query}
      onQueryChange={setQuery}
      loading={read.loading && !results}
      error={read.error ? { message: "Clients indisponibles.", onRetry: read.reload } : null}
      empty={{ title: (q) => (q ? `Aucun client ne correspond à « ${q} »` : "Aucun client") }}
      onCreate={{
        label: (q) => (q ? `Créer « ${q} »` : "Créer un client"),
        form: (ctx) => (
          <CustomerCreateForm
            ctx={ctx}
            options={options}
            onCreated={(customer) =>
              created.current.set(customer.id, {
                id: customer.id,
                fullName: customer.fullName,
                contact: customer.phoneE164 ? formatPhoneNational(customer.phoneE164) : customer.snapchat ? `@${customer.snapchat}` : null,
              })
            }
          />
        ),
      }}
    />
  );
}

/** S10 — création en ligne : nom (pré-rempli par la recherche), téléphone facultatif, alerte d'homonyme. */
function CustomerCreateForm({
  ctx,
  options,
  onCreated,
}: {
  ctx: SelectCreateContext<string>;
  options: readonly SelectOption[];
  onCreated: (customer: { id: string; fullName: string; phoneE164: string | null; snapchat: string | null }) => void;
}) {
  const { showToast } = useToast();
  const router = useRouter();
  const [id] = useState(newId);
  const [fullName, setFullName] = useState(ctx.query);
  const [phone, setPhone] = useState(/^[\d\s+.]+$/.test(ctx.query) ? ctx.query : "");
  const [confirmedHomonym, setConfirmedHomonym] = useState(false);
  const create = useAction(createCustomerAction, {
    errors: "inline",
    onSuccess: (customer) => {
      const complete = routes.modifierClient(customer.id);
      // « Compléter » (06 S10) : la fiche créée nom seul se complète en 1 tap (01 §4.10 : elle ne l'était jamais).
      showToast({
        type: "success",
        message: `Fiche créée : ${customer.fullName}`,
        ...(isNavigable(complete) ? { actionLabel: "Compléter", onAction: () => router.push(complete) } : {}),
      });
      onCreated(customer);
      ctx.select(customer.id);
    },
  });
  const homonym = options.find((option) => cleNom(option.label) === cleNom(fullName) && cleNom(fullName) !== "");
  const fields = create.error?.fields ?? {};
  const conflict = create.error?.code === "CONFLICT" ? create.error.message : null;

  return (
    <div className="flex flex-col gap-4">
      <FormField label="Nom" required error={fields.fullName}>
        {(field) => <Input {...field} value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="off" enterKeyHint="next" />}
      </FormField>
      <FormField label="Téléphone" hint="Facultatif : 06 12 34 56 78" error={fields.phone ?? conflict ?? undefined}>
        {(field) => <Input {...field} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="off" enterKeyHint="done" />}
      </FormField>
      {homonym && !confirmedHomonym ? (
        <div role="status" className="flex flex-col gap-2 rounded-[var(--admin-radius-md)] border border-[var(--admin-warning-border)] bg-[var(--admin-warning-bg)] p-3">
          <Text variant="caption" tone="warning" className="font-medium">
            {homonym.label} existe déjà.
          </Text>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => ctx.select(homonym.value)}>
              Choisir {homonym.label}
            </Button>
            <Button variant="text" size="sm" onClick={() => setConfirmedHomonym(true)}>
              Créer quand même
            </Button>
          </div>
        </div>
      ) : null}
      <div className="flex flex-col gap-2">
        <Button
          variant="primary"
          fullWidth
          isLoading={create.pending}
          disabled={homonym !== undefined && !confirmedHomonym}
          onClick={() => void create.run({ id, fullName, phone: phone.trim() || null })}
        >
          Créer et choisir
        </Button>
        <Button variant="text" fullWidth onClick={ctx.cancel}>
          Revenir à la liste
        </Button>
      </div>
    </div>
  );
}
