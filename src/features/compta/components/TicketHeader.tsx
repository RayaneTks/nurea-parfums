"use client";

import { Avatar } from "@/ui/primitives/Avatar";
import { Card } from "@/ui/primitives/Card";
import { Stack } from "@/ui/primitives/Stack";
import { DateLabel } from "@/ui/patterns/DateLabel";
import { InlineNameEditor } from "@/ui/patterns/InlineNameEditor";
import { Badge } from "@/ui/primitives/Badge";

type TicketHeaderProps = {
  customerName: string;
  customerId: string | null;
  soldAt: string;
  orderId: string | null;
  mode: "view" | "edit";
  onCustomerNameSave: (next: string) => Promise<void>;
};

export function TicketHeader({
  customerName,
  customerId,
  soldAt,
  orderId,
  mode,
  onCustomerNameSave,
}: TicketHeaderProps) {
  return (
    <Card padding={3} tone="surface">
      <div className="flex items-center gap-3">
        <Avatar name={customerName} size="lg" />
        <Stack gap={1} flex>
          <InlineNameEditor
            value={customerName}
            onSave={onCustomerNameSave}
            variant="h2"
            disabled={mode === "view" ? false : false}
            ariaLabel="Modifier le nom du client"
          />
          <span className="text-[12px] text-[var(--admin-text-muted)]">
            <DateLabel date={soldAt} format="datetime" />
            {customerId ? null : <span className="ml-1">· anonyme</span>}
          </span>
          {orderId ? (
            <div className="mt-1">
              <Badge tone="info" size="sm">
                Depuis commande
              </Badge>
            </div>
          ) : null}
        </Stack>
      </div>
    </Card>
  );
}
