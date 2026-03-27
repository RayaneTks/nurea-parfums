import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10 md:px-6">
      <Suspense
        fallback={
          <div className="text-[13px] text-[var(--nurea-text-subtle)]">Chargement…</div>
        }
      >
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
