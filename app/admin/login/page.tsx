import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const metadata: Metadata = {
  title: "Administration — Connexion",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-5 py-10">
      <Suspense
        fallback={
          <div className="text-[13px] text-admin-subtle">Chargement…</div>
        }
      >
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
