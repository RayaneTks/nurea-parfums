import path from "node:path";
import { fileURLToPath } from "node:url";
import bundleAnalyzer from "@next/bundle-analyzer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function supabaseImageRemotes() {
  const hostnames = ["lkdhqqzocmxtyarseizc.supabase.co"];
  return hostnames.map((hostname) => ({
    protocol: "https",
    hostname,
    pathname: "/**",
  }));
}

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["@prisma/client"],
  experimental: {
    viewTransition: true,
  },
  images: {
    remotePatterns: supabaseImageRemotes(),
    /** Inclut des qualités « vignettes » (admin catalogue, listes). */
    qualities: [60, 65, 70, 75, 80, 85, 90],
    /** AVIF + WebP — gain ~20% vs WebP seul pour photos parfums. */
    formats: ["image/avif", "image/webp"],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  /**
   * Obligatoire si un autre package-lock.json existe plus haut dans l'arborescence
   * (ex. `C:\Users\User\package-lock.json`) : sinon Next infère une mauvaise racine
   * et le dev / le build peuvent se comporter bizarrement.
   */
  turbopack: {
    root: __dirname,
  },
};

export default withBundleAnalyzer(nextConfig);
