"use client";

import { Card } from "@/ui/primitives/Card";
import { CustomerField } from "@/ui/patterns/CustomerField";
import type { SelectedCustomer } from "@/features/customers/components/CustomerCombobox";

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
      <CustomerField
        customer={customer}
        customerName={customerName}
        onCustomerChange={onCustomerChange}
        onCustomerNameChange={onCustomerNameChange}
      />
    </Card>
  );
}
