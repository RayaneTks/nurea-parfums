import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata: Metadata = {
  title: "Connexion",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      {/* `useSearchParams` dans le formulaire impose la frontière Suspense. */}
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
