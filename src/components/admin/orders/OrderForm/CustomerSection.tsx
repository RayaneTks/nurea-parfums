"use client";

import { Card } from "@/ui/primitives/Card";
import { Input } from "@/ui/primitives/Input";
import { Stack } from "@/ui/primitives/Stack";
import { CustomerCombobox, type SelectedCustomer } from "../../customers/CustomerCombobox";

type CustomerSectionProps = {
  customer: SelectedCustomer | null;
  customerName: string;
  onCustomerChange: (c: SelectedCustomer | null) => void;
  onCustomerNameChange: (n: string) => void;
};

export function CustomerSection({
  customer,
  customerName,
  onCustomerChange,
  onCustomerNameChange,
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
          />
        ) : null}
      </Stack>
    </Card>
  );
}
