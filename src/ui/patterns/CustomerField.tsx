"use client";

import { useState } from "react";
import { Input } from "@/ui/primitives/Input";
import { Stack } from "@/ui/primitives/Stack";
import {
  CustomerCombobox,
  type SelectedCustomer,
} from "@/features/customers/components/CustomerCombobox";

type CustomerFieldProps = {
  customer: SelectedCustomer | null;
  customerName: string;
  onCustomerChange: (customer: SelectedCustomer | null) => void;
  onCustomerNameChange: (name: string) => void;
  /** Contact libre (téléphone, Snapchat…) — masqué si non fourni. */
  contact?: string;
  onContactChange?: (value: string) => void;
  placeholder?: string;
};

/**
 * Sélection du client, partagée par la commande et la vente.
 *
 * Le champ « nom seul » n'est pas affiché d'emblée : présenter côte à côte un
 * sélecteur de fiche et une saisie libre laissait croire qu'il fallait
 * remplir les deux, alors que l'un annule l'autre. Il est derrière un lien,
 * et se déplie automatiquement s'il porte déjà une valeur.
 */
export function CustomerField({
  customer,
  customerName,
  onCustomerChange,
  onCustomerNameChange,
  contact,
  onContactChange,
  placeholder = "Choisir ou créer un client…",
}: CustomerFieldProps) {
  const [freeform, setFreeform] = useState(customerName.trim().length > 0);
  const showFreeform = customer === null && freeform;

  return (
    <Stack gap={2}>
      <CustomerCombobox
        value={customer}
        onChange={(c) => {
          onCustomerChange(c);
          if (c) {
            onCustomerNameChange(c.fullName);
            setFreeform(false);
          }
        }}
        placeholder={placeholder}
      />

      {customer === null && !freeform ? (
        <button
          type="button"
          onClick={() => setFreeform(true)}
          className="self-start text-[13px] font-medium text-[var(--admin-accent)] tap-scale hover:underline"
        >
          Client de passage, sans fiche
        </button>
      ) : null}

      {showFreeform ? (
        <Input
          label="Nom du client"
          value={customerName}
          onChange={(e) => onCustomerNameChange(e.target.value)}
          placeholder="Prénom Nom"
          autoComplete="off"
          variant="elevated"
          enterKeyHint="next"
          hint="Aucune fiche ne sera créée : ce nom reste sur la commande."
        />
      ) : null}

      {showFreeform && onContactChange ? (
        <Input
          label="Contact"
          value={contact ?? ""}
          onChange={(e) => onContactChange(e.target.value)}
          placeholder="Téléphone, Snapchat, WhatsApp…"
          autoComplete="off"
          variant="elevated"
          enterKeyHint="done"
        />
      ) : null}
    </Stack>
  );
}
