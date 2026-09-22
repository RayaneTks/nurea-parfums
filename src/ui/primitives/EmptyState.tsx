import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type WithAction = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /**
   * L'action suivante, NOMMÉE : « Créer un parfum », « Effacer les filtres ».
   * Obligatoire — un vide qui n'oriente pas laisse l'utilisateur deviner.
   */
  action: ReactNode;
  done?: never;
  className?: string;
};

type AllDone = {
  /**
   * Vide « tout est fait » (aucune créance, rien à livrer) : une bonne nouvelle,
   * dite en une ligne calme, sans bouton ni icône (05 §5.1).
   */
  done: true;
  title: string;
  icon?: never;
  description?: never;
  action?: never;
  className?: string;
};

type EmptyStateProps = WithAction | AllDone;

/** État vide guidant (05 §5.1). Le type impose l'action, sauf « tout est fait ». */
export function EmptyState(props: EmptyStateProps) {
  if (props.done) {
    return (
      <p className={cn("admin-type-body px-4 py-6 text-center text-[var(--admin-text-muted)]", props.className)}>
        {props.title}
      </p>
    );
  }
  const { icon: Icon, title, description, action, className } = props;
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-10 text-center", className)}>
      {Icon ? (
        <span
          aria-hidden
          className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-[var(--admin-radius-full)] bg-[var(--admin-surface-muted)] text-[var(--admin-text-muted)]"
        >
          <Icon size={24} />
        </span>
      ) : null}
      <p className="admin-type-h3 text-[var(--admin-text)]">{title}</p>
      {description ? (
        <p className="admin-type-caption mt-1 max-w-sm text-[var(--admin-text-muted)]">{description}</p>
      ) : null}
      <div className="mt-4">{action}</div>
    </div>
  );
}
