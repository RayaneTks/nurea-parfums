"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { AdminButton } from "./ui/AdminButton";
import { AdminInput } from "./ui/AdminInput";

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errQ = searchParams.get("err");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const configErr =
    errQ === "config"
      ? "Serveur mal configuré (ADMIN_JWT_SECRET). Vérifie les variables d'environnement."
      : errQ === "session"
        ? "Session expirée. Reconnecte-toi."
        : null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      const contentType = res.headers.get("content-type") ?? "";
      const data = contentType.includes("application/json")
        ? ((await res.json()) as { error?: string })
        : { error: "Réponse serveur invalide." };
      if (!res.ok) {
        setError(data.error ?? "Échec de la connexion.");
        return;
      }
      router.replace("/admin/catalogue");
      router.refresh();
    } catch {
      setError("Connexion serveur impossible.");
    } finally {
      setLoading(false);
    }
  }

  const message = configErr || error;

  return (
    <div className="w-full max-w-sm">
      <Link
        href="/"
        className="mb-6 inline-flex min-h-11 items-center gap-2 text-[13px] font-medium text-admin-muted transition-colors duration-200 [@media(hover:hover)]:hover:text-admin-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent rounded-lg px-2 -ml-2"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour à la boutique
      </Link>

      <div className="bg-admin-surface border border-admin-border p-8 rounded-3xl shadow-admin-lg">
        <div className="mb-7 text-center">
          <Image
            src="/branding/monogram/logo4_monogram_free_bordeaux_1024.svg"
            alt="Nuréa Parfums"
            width={64}
            height={64}
            className="mx-auto mb-4"
            priority
          />
          <h1 className="font-sans text-[26px] font-bold leading-[1.1] tracking-tight text-admin-text">
            Bienvenue
          </h1>
          <p className="mt-1.5 text-[14px] text-admin-muted">
            Connecte-toi pour gérer la boutique
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {message ? (
            <div
              role="alert"
              className="rounded-2xl border border-[var(--admin-danger-border)] bg-[var(--admin-danger-subtle)] px-4 py-3 text-[13px] text-admin-danger"
            >
              {message}
            </div>
          ) : null}

          <AdminInput
            label="Identifiant"
            type="text"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <AdminInput
            label="Mot de passe"
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="pt-2">
            <AdminButton
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
              className="w-full"
            >
              {loading ? "Connexion…" : "Se connecter"}
            </AdminButton>
          </div>
        </form>
      </div>
    </div>
  );
}
