import { prisma } from "@/lib/db/prisma";
import { searchCustomers } from "@/server/customers/queries";
import type { OrderStatus } from "@prisma/client";

export type SearchPerfume = {
  id: number;
  name: string;
  image: string;
  brandName: string;
};

export type SearchCustomer = {
  id: string;
  fullName: string;
  phoneE164: string | null;
};

export type SearchOrder = {
  id: string;
  customerName: string;
  status: OrderStatus;
  orderedAt: string;
};

export type GlobalSearchResult = {
  perfumes: SearchPerfume[];
  customers: SearchCustomer[];
  orders: SearchOrder[];
};

const EMPTY: GlobalSearchResult = { perfumes: [], customers: [], orders: [] };

/**
 * Recherche transversale admin : parfums (nom/marque), clients (nom/tél/snap),
 * commandes (nom client). Limité à quelques résultats par type pour la palette.
 */
export async function globalSearch(query: string): Promise<GlobalSearchResult> {
  const q = query.trim();
  if (q.length < 2) return EMPTY;

  const [perfumesRaw, customers, ordersRaw] = await Promise.all([
    prisma.perfume.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { brand: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      take: 6,
      orderBy: { name: "asc" },
      select: { id: true, name: true, image: true, brand: { select: { name: true } } },
    }),
    searchCustomers(q, 6),
    prisma.order.findMany({
      where: { customerName: { contains: q, mode: "insensitive" } },
      take: 6,
      orderBy: { orderedAt: "desc" },
      select: { id: true, customerName: true, status: true, orderedAt: true },
    }),
  ]);

  return {
    perfumes: perfumesRaw.map((p) => ({
      id: p.id,
      name: p.name,
      image: p.image,
      brandName: p.brand.name,
    })),
    customers: customers.map((c) => ({
      id: c.id,
      fullName: c.fullName,
      phoneE164: c.phoneE164 ?? null,
    })),
    orders: ordersRaw.map((o) => ({
      id: o.id,
      customerName: o.customerName ?? "Anonyme",
      status: o.status,
      orderedAt: o.orderedAt.toISOString(),
    })),
  };
}
