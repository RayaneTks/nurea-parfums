"use client";

import Link from "next/link";
import { ArrowLeft, MapPin, MessageCircle, Phone } from "lucide-react";
import { Avatar } from "@/ui/primitives/Avatar";
import { Card } from "@/ui/primitives/Card";
import { Stack } from "@/ui/primitives/Stack";
import { InlineNameEditor } from "@/ui/patterns/InlineNameEditor";
import { DateLabel } from "@/ui/patterns/DateLabel";
import type { CustomerDetail } from "@/server/customers/queries";

type CustomerHeaderProps = {
  customer: CustomerDetail;
  onNameSave: (next: string) => Promise<void>;
};

export function CustomerHeader({ customer, onNameSave }: CustomerHeaderProps) {
  return (
    <Stack gap={4}>
      <Link
        href="/admin/clients"
        className="inline-flex w-fit items-center gap-1 text-[13px] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] tap-scale"
      >
        <ArrowLeft size={14} /> Clients
      </Link>

      <Card padding={3} tone="surface">
        <div className="flex items-start gap-3">
          <Avatar name={customer.fullName} size="xl" />
          <Stack gap={1} flex>
            <InlineNameEditor
              value={customer.fullName}
              onSave={onNameSave}
              variant="h1"
              ariaLabel="Modifier le nom"
            />
            <p className="text-[12px] text-[var(--admin-text-muted)]">
              Client depuis le <DateLabel date={customer.createdAt} format="long" />
            </p>
          </Stack>
        </div>

        {(customer.phoneE164 || customer.whatsappE164 || customer.snapchat || customer.address) ? (
          <Stack gap={2} className="mt-3 pt-3" style={{ borderTop: "1px solid var(--admin-border)" }}>
            {customer.phoneE164 ? (
              <a
                href={`tel:${customer.phoneE164}`}
                className="flex items-center gap-2 text-[14px] text-[var(--admin-text)] tap-scale"
              >
                <Phone size={14} className="text-[var(--admin-text-subtle)]" aria-hidden />
                <span className="tabular-nums">{customer.phoneE164}</span>
              </a>
            ) : null}
            {customer.whatsappE164 ? (
              <a
                href={`https://wa.me/${customer.whatsappE164.replace("+", "")}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-[14px] text-[var(--admin-text)] tap-scale"
              >
                <MessageCircle size={14} className="text-[var(--admin-text-subtle)]" aria-hidden />
                <span>WhatsApp</span>
              </a>
            ) : null}
            {customer.snapchat ? (
              <div className="flex items-center gap-2 text-[14px]">
                <MessageCircle size={14} className="text-[var(--admin-text-subtle)]" aria-hidden />
                <span>Snap : {customer.snapchat}</span>
              </div>
            ) : null}
            {customer.address ? (
              <div className="flex items-start gap-2 text-[14px]">
                <MapPin size={14} className="mt-0.5 text-[var(--admin-text-subtle)]" aria-hidden />
                <span className="whitespace-pre-line">{customer.address}</span>
              </div>
            ) : null}
          </Stack>
        ) : null}
      </Card>
    </Stack>
  );
}
