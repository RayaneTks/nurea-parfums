import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin/session";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Administration — Catalogue",
  robots: { index: false, follow: false },
};

export default async function AdminCataloguePage() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) {
    redirect("/admin/login");
  }

  const user = await verifyAdminToken(token);
  if (!user) {
    redirect("/admin/login");
  }

  const [brands, perfumes] = await Promise.all([
    prisma.brand.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        catalogMode: true,
        status: true,
        image: true,
        imageLight: true,
        _count: { select: { perfumes: true } },
      },
    }),
    prisma.perfume.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        image: true,
        imageLight: true,
        isFeatured: true,
        status: true,
        brand: {
          select: {
            id: true,
            name: true,
            image: true,
            catalogMode: true,
            status: true,
          },
        },
      },
    }),
  ]);

  return (
    <AdminDashboard
      initialData={{
        user: { username: user.username, role: user.role },
        brands,
        perfumes,
      }}
    />
  );
}
