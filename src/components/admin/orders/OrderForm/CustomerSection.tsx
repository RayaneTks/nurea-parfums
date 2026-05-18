"use client";

import { Card } from "@/ui/primitives/Card";
import { Input } from "@/ui/primitives/Input";
import { Stack } from "@/ui/primitives/Stack";
import { CustomerCombobox, type SelectedCustomer } from "../../customers/CustomerCombobox";

type CustomerSectionProps = {
  customer: SelectedCustomer | null;
  customerName: string;
  customerContact: string;
  onCustomerChange: (c: SelectedCustomer | null) => void;
  onCustomerNameChange: (n: string) => void;
  onCustomerContactChange: (c: string) => void;
};

export function CustomerSection({
  customer,
  customerName,
  customerContact,
  onCustomerChange,
  onCustomerNameChange,
  onCustomerContactChange,
}: CustomerSectionProps) {
  return (
    <Card padding={3}>
      <h2 className="mb-3 text-[14px] font-semibold text-[var(--admin-text)]">Client</h2>
      <Stack gap={2}>
        <CustomerCombobox
          value={customer}
          onChange={(c) => {
            onCustomerChange(c);
            if (c) onCustomerNameChange(c.fullName);
          }}
          placeholder="Choisir ou créer un client…"
        />
        {customer === null ? (
          <Input
            label="Ou nom seul (sans fiche)"
            value={customerName}
            onChange={(e) => onCustomerNameChange(e.target.value)}
            placeholder="Prénom Nom"
            autoComplete="off"
            enterKeyHint="next"
          />
        ) : null}
        <Input
          label="Contact (téléphone, Snap, Insta…)"
          value={customerContact}
          onChange={(e) => onCustomerContactChange(e.target.value)}
          placeholder="+33 6 12 34 56 78 / @snap…"
          autoComplete="off"
          enterKeyHint="done"
          hint="Optionnel. Conservé sur la commande et reporté sur la vente."
        />
      </Stack>
    </Card>
  );
}
