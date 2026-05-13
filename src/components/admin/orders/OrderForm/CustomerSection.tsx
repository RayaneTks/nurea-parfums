"use client";

import { SectionCard } from "../../ui/SectionCard";
import { AdminInput } from "../../ui/AdminInput";
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
    <SectionCard>
      <h2 className="mb-3 text-sm font-semibold text-neutral-900">Client</h2>
      <CustomerCombobox
        value={customer}
        onChange={(c) => {
          onCustomerChange(c);
          if (c) onCustomerNameChange(c.fullName);
        }}
        placeholder="Choisir ou créer un client…"
      />
      {customer === null ? (
        <div className="mt-2">
          <AdminInput
            label="Ou nom seul (sans fiche)"
            value={customerName}
            onChange={(e) => onCustomerNameChange(e.target.value)}
            placeholder="Prénom Nom"
            autoComplete="off"
          />
        </div>
      ) : null}
    </SectionCard>
  );
}
