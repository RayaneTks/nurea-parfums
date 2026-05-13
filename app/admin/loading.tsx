import { AdminRouteFallback } from "@/components/admin/ui/AdminLoadingPrimitives";

/**
 * Navigation entre routes `/admin/*` (RSC) : squelette mobile/PWA aligné sur le shell.
 */
export default function AdminLoading() {
  return <AdminRouteFallback rows={6} rowClassName="h-[72px]" />;
}
