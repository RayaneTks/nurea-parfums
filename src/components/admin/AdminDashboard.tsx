"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminNav } from "./AdminNav";

type SessionUser = { username: string; role: string };

type BrandRow = { id: string; name: string; slug: string; _count: { perfumes: number } };

type PerfumeRow = {
  id: number;
  name: string;
  category: string;
  status: string;
  deletedAt: string | null;
  brand: { name: string };
};

export function AdminDashboard() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [perfumes, setPerfumes] = useState<PerfumeRow[]>([]);
  const [newBrand, setNewBrand] = useState("");
  const [brandMsg, setBrandMsg] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoadErr(null);
    try {
      const [s, b, p] = await Promise.all([
        fetch("/api/admin/session", { credentials: "include" }),
        fetch("/api/admin/brands", { credentials: "include" }),
        fetch("/api/admin/perfumes?includeDeleted=1", { credentials: "include" }),
      ]);
      if (!s.ok) throw new Error("Session invalide.");
      const sj = (await s.json()) as { user?: SessionUser };
      setUser(sj.user ?? null);

      if (b.ok) {
        const bj = (await b.json()) as { brands: BrandRow[] };
        setBrands(bj.brands ?? []);
      }
      if (p.ok) {
        const pj = (await p.json()) as { perfumes: PerfumeRow[] };
        setPerfumes(pj.perfumes ?? []);
      }
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Erreur de chargement");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function addBrand(e: React.FormEvent) {
    e.preventDefault();
    setBrandMsg(null);
    const name = newBrand.trim();
    if (name.length < 2) return;
    const r = await fetch("/api/admin/brands", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const j = (await r.json()) as { error?: string };
    if (!r.ok) {
      setBrandMsg(j.error ?? "Refusé");
      return;
    }
    setNewBrand("");
    setBrandMsg("Marque créée.");
    refresh();
  }

  async function removePerfume(id: number) {
    if (!confirm(`Archiver le parfum #${id} ? (suppression douce)`)) return;
    const r = await fetch(`/api/admin/perfumes/${id}`, { method: "DELETE", credentials: "include" });
    if (!r.ok) {
      const j = (await r.json()) as { error?: string };
      alert(j.error ?? "Erreur");
      return;
    }
    refresh();
  }

  return (
    <div className="min-h-screen bg-[var(--nurea-bg)] text-[var(--nurea-text)]">
      <AdminNav />
      <div className="mx-auto max-w-[1200px] px-4 py-10 md:px-10">
        <h1 className="font-serif text-3xl text-[var(--nurea-text)]">Catalogue</h1>
        {user ? (
          <p className="mt-2 text-[12px] text-[var(--nurea-text-muted)]">
            Connecté : {user.username} ({user.role})
          </p>
        ) : null}
        {loadErr ? (
          <p className="mt-4 text-[12px] text-[var(--nurea-accent)]">{loadErr}</p>
        ) : null}

        <div className="mt-10 grid gap-10 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-6 border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] p-5">
            <h2 className="text-[10px] uppercase tracking-[0.2em] text-[var(--nurea-accent)]">
              Marques
            </h2>
            <ul className="max-h-[240px] space-y-1 overflow-y-auto text-[12px] text-[var(--nurea-text-muted)]">
              {brands.map((b) => (
                <li key={b.id}>
                  {b.name}{" "}
                  <span className="text-[var(--nurea-text-subtle)]">({b._count.perfumes})</span>
                </li>
              ))}
            </ul>
            <form
              onSubmit={addBrand}
              className="space-y-2 border-t border-[var(--nurea-border)] pt-4"
            >
              <label className="block text-[10px] uppercase tracking-[0.15em] text-[var(--nurea-text-muted)]">
                Nouvelle marque
                <input
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  disabled={user?.role === "VIEWER"}
                  className="mt-1 block w-full border border-[var(--nurea-border)] bg-[var(--nurea-bg)] px-2 py-2 text-[13px] text-[var(--nurea-text)] disabled:opacity-50"
                />
              </label>
              {brandMsg ? <p className="text-[11px] text-[var(--nurea-text-subtle)]">{brandMsg}</p> : null}
              <button
                type="submit"
                disabled={user?.role === "VIEWER"}
                className="btn-nurea w-full justify-center text-[10px] disabled:opacity-50"
              >
                Ajouter
              </button>
            </form>
            {user?.role === "VIEWER" ? (
              <p className="text-[11px] text-[var(--nurea-text-subtle)]">
                Rôle lecteur seul : pas de création ni d’édition.
              </p>
            ) : null}
          </aside>

          <div className="overflow-x-auto border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)]">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--nurea-border)] px-4 py-3">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--nurea-text-muted)]">
                Parfums ({perfumes.length})
              </span>
              {user?.role !== "VIEWER" ? (
                <Link
                  href="/admin/perfumes/new"
                  className="btn-nurea btn-accent text-[10px]"
                >
                  Nouveau
                </Link>
              ) : null}
            </div>
            <table className="w-full min-w-[640px] text-left text-[12px]">
              <thead className="border-b border-[var(--nurea-border)] text-[10px] uppercase tracking-[0.12em] text-[var(--nurea-text-muted)]">
                <tr>
                  <th className="px-3 py-2 font-medium">ID</th>
                  <th className="px-3 py-2 font-medium">Nom</th>
                  <th className="px-3 py-2 font-medium">Marque</th>
                  <th className="px-3 py-2 font-medium">Cat.</th>
                  <th className="px-3 py-2 font-medium">Statut</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {perfumes.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[var(--nurea-border)]/60 hover:bg-[var(--nurea-surface-hover)]"
                  >
                    <td className="px-3 py-2 font-mono text-[11px]">{row.id}</td>
                    <td className="px-3 py-2">
                      {row.name}
                      {row.deletedAt ? (
                        <span className="ml-2 text-[10px] text-[var(--nurea-accent)]">supprimé</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-[var(--nurea-text-muted)]">{row.brand.name}</td>
                    <td className="px-3 py-2 text-[var(--nurea-text-muted)]">{row.category}</td>
                    <td className="px-3 py-2">{row.status}</td>
                    <td className="px-3 py-2 text-right">
                      {user?.role !== "VIEWER" ? (
                        <span className="inline-flex flex-wrap justify-end gap-2">
                          <Link
                            href={`/admin/perfumes/${row.id}/edit`}
                            className="text-[10px] uppercase tracking-[0.12em] text-[var(--nurea-accent)]"
                          >
                            Modifier
                          </Link>
                          <button
                            type="button"
                            onClick={() => removePerfume(row.id)}
                            className="text-[10px] uppercase tracking-[0.12em] text-[var(--nurea-text-subtle)] hover:text-[var(--nurea-accent)]"
                          >
                            Archiver
                          </button>
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
