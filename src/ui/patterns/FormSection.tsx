"use client";

import type { ReactNode } from "react";
import { Card } from "@/ui/primitives/Card";
import { Stack } from "@/ui/primitives/Stack";

type FormSectionProps = {
  /** Titre de section (h2 visuel). */
  title?: string;
  /** Description courte sous le titre. */
  description?: string;
  /** Espace inter-champs (defaut 3). */
  gap?: 2 | 3 | 4;
  /** Padding interne de la Card (defaut 3). */
  padding?: 2 | 3 | 4;
  /** Sans Card wrapper (juste un Stack titré). */
  bare?: boolean;
  children: ReactNode;
};

/**
 * Section de formulaire = Card + heading optionnel + Stack de champs.
 *
 * Garantit cohérence visuelle :
 * - gap inter-champs uniforme
 * - heading taille fixe
 * - padding consistant entre toutes les sections
 */
export function FormSection({
  title,
  description,
  gap = 3,
  padding = 3,
  bare = false,
  children,
}: FormSectionProps) {
  const body = (
    <Stack gap={gap}>
      {title || description ? (
        <div>
          {title ? (
            <h2 className="text-[14px] font-semibold leading-tight text-[var(--admin-text)]">
              {title}
            </h2>
          ) : null}
          {description ? (
            <p className="mt-1 text-[12px] text-[var(--admin-text-muted)]">{description}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </Stack>
  );

  if (bare) return body;
  return <Card padding={padding}>{body}</Card>;
}
