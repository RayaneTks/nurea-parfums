import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Administration — catalogue",
  robots: { index: false, follow: false },
};

export default function AdminCataloguePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 text-zinc-500">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="font-medium">Initialisation du tableau de bord...</p>
      </div>
    }>
      <AdminDashboard />
    </Suspense>
  );
}
