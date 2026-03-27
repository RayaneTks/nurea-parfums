import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <Suspense
        fallback={
          <div className="text-[13px] text-[#999]">Chargement…</div>
        }
      >
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
