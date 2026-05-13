import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, MessageCircle, Pencil, Phone, UserRound } from "lucide-react";
import { getCustomerById } from "@/server/customers/queries";
import { prisma } from "@/lib/db/prisma";
import { SectionCard } from "@/components/admin/ui/SectionCard";
import { StatCard } from "@/components/admin/ui/StatCard";
import { OrderStatusBadge } from "@/components/admin/ui/OrderStatusBadge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Client — Admin",
};

type Params = Promise<{ id: string }>;

export default async function CustomerDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const customer = await getCustomerById(id);
  if (!customer) notFound();

  const orders = await prisma.order.findMany({
    where: { customerId: id },
    orderBy: { orderedAt: "desc" },
    take: 50,
    select: {
      id: true,
      orderedAt: true,
      deliveryAt: true,
      status: true,
      items: { select: { unitPrice: true, quantity: true } },
    },
  });

  const dueNum = Number(customer.outstandingBalance);

  return (
    <main id="main-content" className="flex-1 space-y-5 px-5 pb-4 pt-2">
      <Link
        href="/admin/clients"
        className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900"
      >
        <ArrowLeft size={14} /> Clients
      </Link>

      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-nurea-bordeaux/10 text-nurea-bordeaux">
            <UserRound size={22} />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold leading-tight tracking-tight text-neutral-900">
              {customer.fullName}
            </h1>
            <p className="text-xs text-neutral-500">
              Client depuis le {new Date(customer.createdAt).toLocaleDateString("fr-FR")}
            </p>
          </div>
        </div>
        <Link
          href={`/admin/clients/${id}/edit`}
          prefetch
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 text-neutral-700 tap-scale"
          aria-label="Modifier"
        >
          <Pencil size={16} />
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Commandes" value={String(customer.ordersCount)} />
        <StatCard
          label="Solde dû"
          value={dueNum > 0 ? `${dueNum.toFixed(2)} €` : "0,00 €"}
          tone={dueNum > 0 ? "danger" : "default"}
        />
      </div>

      <SectionCard>
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Contact</h2>
        <dl className="space-y-2 text-sm">
          {customer.phoneE164 ? (
            <div className="flex items-center gap-2">
              <Phone size={14} className="text-neutral-500" />
              <a className="text-nurea-bordeaux underline" href={`tel:${customer.phoneE164}`}>
                {customer.phoneE164}
              </a>
            </div>
          ) : null}
          {customer.whatsappE164 ? (
            <div className="flex items-center gap-2">
              <MessageCircle size={14} className="text-neutral-500" />
              <a
                className="text-nurea-bordeaux underline"
                href={`https://wa.me/${customer.whatsappE164.replace("+", "")}`}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>
            </div>
          ) : null}
          {customer.snapchat ? (
            <div className="flex items-center gap-2">
              <MessageCircle size={14} className="text-neutral-500" />
              <span>Snapchat : {customer.snapchat}</span>
            </div>
          ) : null}
          {customer.address ? (
            <div className="flex items-start gap-2">
              <MapPin size={14} className="mt-0.5 text-neutral-500" />
              <span className="whitespace-pre-line">{customer.address}</span>
            </div>
          ) : null}
          {!customer.phoneE164 && !customer.whatsappE164 && !customer.snapchat && !customer.address ? (
            <p className="text-xs text-neutral-500">Aucun moyen de contact renseigné.</p>
          ) : null}
        </dl>
        {customer.notes ? (
          <>
            <h3 className="mt-4 mb-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Notes
            </h3>
            <p className="whitespace-pre-line text-sm text-neutral-700">{customer.notes}</p>
          </>
        ) : null}
      </SectionCard>

      <SectionCard>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">Historique commandes</h2>
          {orders.length > 0 ? (
            <span className="text-xs text-neutral-500">{orders.length} récentes</span>
          ) : null}
        </div>
        {orders.length === 0 ? (
          <p className="py-2 text-sm text-neutral-500">Aucune commande pour ce client.</p>
        ) : (
          <ul className="-mx-2 divide-y divide-neutral-100">
            {orders.map((o) => {
              const total = o.items.reduce(
                (acc, it) => acc + Number(it.unitPrice) * it.quantity,
                0,
              );
              return (
                <li key={o.id}>
                  <Link
                    href={`/admin/ordres/${o.id}`}
                    prefetch
                    className="flex items-center justify-between gap-3 px-2 py-2.5 tap-scale active:bg-neutral-50"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-neutral-900">
                        {new Date(o.orderedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                      <span className="block text-xs text-neutral-500">
                        {total.toFixed(2)} €
                      </span>
                    </span>
                    <OrderStatusBadge status={o.status} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </main>
  );
}
