"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Mince barre de progression au-dessus du header pendant les transitions de route.
 *
 * Implementation : observe les changements de pathname et anime une barre 1.6s.
 * Pas d'indicateur de pending réel (Next 16 ne l'expose pas universellement),
 * juste un feedback visuel.
 */
export function AdminLoadingProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(true);
    const t = setTimeout(() => setActive(false), 600);
    return () => clearTimeout(t);
  }, [pathname]);

  if (!active) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[var(--admin-app-max-width)] z-[60] overflow-hidden"
      style={{ height: 2, marginTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div
        className="h-full motion-safe:animate-pulse"
        style={{
          background: "var(--admin-accent)",
          width: "100%",
          opacity: 0.6,
        }}
      />
    </div>
  );
}
