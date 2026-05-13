import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grain flex min-h-[100svh] flex-col items-center justify-center bg-[var(--nurea-bg)] px-6 py-20 text-center text-[var(--nurea-text)]">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.3em] text-[var(--nurea-accent)]">        
        404
      </p>
      <h1 className="mb-4 font-serif text-[clamp(32px,6vw,48px)] leading-tight">
        Page introuvable
      </h1>
      <p className="mb-10 max-w-sm text-[14px] leading-relaxed text-[var(--nurea-text-muted)]">
        Cette adresse ne correspond à aucun parfum ou page de notre catalogue.
      </p>
      <Link href="/" className="btn-nurea btn-accent">
        Voir le Catalogue
      </Link>
    </div>
  );
}
