"use client";

import { UserRound } from "lucide-react";
import { forwardRef, useState } from "react";
import { useReadRoute } from "@/app-shell/hooks/useReadRoute";
import { SEARCH_MIN_LENGTH, type SearchResultsDTO } from "@/contracts/search";
import { cleNom } from "@/lib/nommage";
import { FormField } from "@/ui/patterns/FormField";
import { Avatar } from "@/ui/primitives/Avatar";
import { Card } from "@/ui/primitives/Card";
import { Input } from "@/ui/primitives/Input";
import { ListRow } from "@/ui/primitives/ListRow";
import type { ComposerCustomer } from "./composer-model";

/** URL de la route de lecture (04 §3.5) : pas une adresse d'écran, elle ne vit pas dans `routes.ts`. */
const searchUrl = (q: string) => `/api/admin/search?scope=customers&q=${encodeURIComponent(q)}`;

const MAX_SUGGESTIONS = 4;

type CustomerNameFieldProps = {
  customer: ComposerCustomer;
  order: boolean;
  error?: string;
  onType: (name: string) => void;
  onPick: (customer: { id: string; fullName: string; contact: string | null }) => void;
};

/**
 * Client du composeur : un nom, rien d'autre. Les fiches qui lui ressemblent sont proposées sous le champ ; à
 * l'enregistrement, un nom tapé reprend la fiche du même nom, ou en crée une (`named`, T1).
 */
export const CustomerNameField = forwardRef<HTMLInputElement, CustomerNameFieldProps>(function CustomerNameField(
  { customer, order, error, onType, onPick },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const linked = customer.kind === "linked";
  const value = linked ? customer.fullName : customer.name;
  const trimmed = value.trim();
  const searching = !linked && trimmed.length >= SEARCH_MIN_LENGTH;
  const read = useReadRoute<SearchResultsDTO>(searching ? searchUrl(trimmed) : null, { debounceMs: 200 });
  const hits = searching && read.data ? read.data.customers.items : [];
  const known = hits.find((hit) => cleNom(hit.fullName) === cleNom(trimmed));
  const suggestions = focused ? hits.slice(0, MAX_SUGGESTIONS) : [];

  const hint = linked
    ? ["Client enregistré", customer.contact].filter(Boolean).join(" · ")
    : trimmed.length >= 2
      ? known
        ? "Client enregistré : la vente ira sur sa fiche."
        : read.loading && searching
          ? undefined
          : "Nouveau client : sa fiche sera créée à l'enregistrement."
      : order
        ? "Une commande se suit sous un nom."
        : "Chaque vente se range sur une fiche client.";

  return (
    <div className="flex flex-col gap-2" data-customer-field>
      <FormField label="Nom du client" required hint={hint} error={error}>
        {(field) => (
          <Input
            ref={ref}
            {...field}
            value={value}
            onChange={(e) => onType(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            leadingIcon={<UserRound size={16} aria-hidden />}
            autoComplete="off"
            autoCapitalize="words"
            enterKeyHint="done"
            placeholder="Nom du client"
          />
        )}
      </FormField>
      {suggestions.length > 0 ? (
        // Le doigt posé sur une suggestion ne doit pas fermer la liste avant le tap (blur du champ).
        <div onMouseDown={(e) => e.preventDefault()} data-customer-suggestions>
          <Card padding={0}>
            {suggestions.map((hit) => (
              <ListRow
                key={hit.id}
                leading={<Avatar name={hit.fullName} size="md" />}
                primary={hit.fullName}
                secondary={hit.contact ?? undefined}
                onClick={() => {
                  onPick({ id: hit.id, fullName: hit.fullName, contact: hit.contact });
                  setFocused(false);
                }}
              />
            ))}
          </Card>
        </div>
      ) : null}
    </div>
  );
});
