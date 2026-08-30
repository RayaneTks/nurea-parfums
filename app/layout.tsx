import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { SITE_URL } from "@/lib/site";

/**
 * Root layout minimal — volontairement SANS CSS ni police.
 *
 * Les deux registres du produit ont des feuilles de style disjointes :
 *   - vitrine  → `app/(shop)/layout.tsx`  (globals.css, GFS Didot + Inter, thème sombre)
 *   - gestion  → `app/admin/layout.tsx`   (globals.admin.css, -apple-system, thème clair)
 *
 * Garder l'import ici embarquerait la CSS vitrine et deux polices Google dans
 * chaque écran de la PWA admin.
 */

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const headerList = await headers();
  const isAdminRoute = headerList.get("x-nurea-admin-route") === "1";

  return (
    <html
      lang="fr"
      className={isAdminRoute ? "admin-route-root" : "dark"}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className={isAdminRoute ? "admin-route" : undefined}>{children}</body>
    </html>
  );
}
