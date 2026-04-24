import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6">
      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-3 text-[var(--admin-muted)]">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--admin-accent-solid)]" aria-hidden />
            <span className="text-sm font-medium">Chargement…</span>
          </div>
        }
      >
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
