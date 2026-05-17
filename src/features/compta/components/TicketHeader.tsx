"use client";

import { Phone } from "lucide-react";
import { Avatar } from "@/ui/primitives/Avatar";
import { Card } from "@/ui/primitives/Card";
import { Stack } from "@/ui/primitives/Stack";
import { DateLabel } from "@/ui/patterns/DateLabel";
import { InlineNameEditor } from "@/ui/patterns/InlineNameEditor";
import { Input } from "@/ui/primitives/Input";
import { Badge } from "@/ui/primitives/Badge";

type TicketHeaderProps = {
  customerName: string;
  customerContact: string;
  soldAt: string;
  orderId: string | null;
  mode: "view" | "edit";
  onCustomerNameSave: (next: string) => Promise<void>;
  onCustomerContactChange: (next: string) => void;
};

export function TicketHeader({
  customerName,
  customerContact,
  soldAt,
  orderId,
  mode,
  onCustomerNameSave,
  onCustomerContactChange,
}: TicketHeaderProps) {
  return (
    <Card padding={3} tone="surface">
      <Stack gap={2}>
        <div className="flex items-center gap-3">
          <Avatar name={customerName} size="lg" />
          <Stack gap={1} flex>
            <InlineNameEditor
              value={customerName}
              onSave={onCustomerNameSave}
              variant="h2"
              ariaLabel="Modifier le nom du client"
            />
            <span className="text-[12px] text-[var(--admin-text-muted)]">
              <DateLabel date={soldAt} format="datetime" />
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

        {mode === "edit" ? (
          <Input
            label="Contact (optionnel)"
            value={customerContact}
            onChange={(e) => onCustomerContactChange(e.target.value)}
            placeholder="Téléphone, Snapchat, Instagram…"
            leadingIcon={<Phone size={14} />}
            variant="elevated"
            autoComplete="off"
            enterKeyHint="done"
          />
        ) : customerContact ? (
          <p className="inline-flex items-center gap-1.5 text-[13px] text-[var(--admin-text-muted)]">
            <Phone size={13} className="shrink-0" aria-hidden />
            <span className="truncate">{customerContact}</span>
          </p>
        ) : null}
      </Stack>
    </Card>
  );
}
