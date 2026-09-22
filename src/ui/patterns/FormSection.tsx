import type { ReactNode } from "react";
import { Card } from "../primitives/Card";
import { Stack } from "../primitives/Stack";

type FormSectionProps = {
  title?: string;
  description?: string;
  /** Sans carte : un Stack titré (dans une sheet). */
  bare?: boolean;
  children: ReactNode;
};

/**
 * Section de formulaire = carte + titre + champs, gap et padding uniformes
 * (12 px entre champs, 05 §2.3). Les champs facultatifs vont dans une
 * `CollapsibleSection` repliée : l'essentiel visible, le reste à un tap.
 */
export function FormSection({ title, description, bare = false, children }: FormSectionProps) {
  const body = (
    <Stack gap={3}>
      {title || description ? (
        <div>
          {title ? <h2 className="admin-type-h3 text-[var(--admin-text)]">{title}</h2> : null}
          {description ? <p className="admin-type-caption mt-1 text-[var(--admin-text-muted)]">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </Stack>
  );
  return bare ? body : <Card padding={4}>{body}</Card>;
}
