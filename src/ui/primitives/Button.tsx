import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "text";
export type ButtonSize = "sm" | "md" | "lg";

type NativeProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "children">;

type BaseProps = NativeProps & {
  /** `primary` : UN SEUL visible par écran (05 §5.4) — compté par `test:layout` via `data-variant`. */
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Spinner + `aria-busy`, clic inhibé : un double tap n'écrit jamais deux fois. */
  isLoading?: boolean;
};

type LabelButtonProps = BaseProps & {
  iconOnly?: false;
  children: ReactNode;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  ariaLabel?: string;
};

type IconButtonProps = BaseProps & {
  /**
   * Bouton icône seule : carré de 44 px au moins, quelle que soit l'icône
   * (52 px en `lg`). Sans libellé visible, `ariaLabel` est OBLIGATOIRE — c'est
   * le type qui le garantit, pas la relecture.
   */
  iconOnly: true;
  ariaLabel: string;
  /** L'icône. */
  children: ReactNode;
  fullWidth?: never;
  leadingIcon?: never;
  trailingIcon?: never;
};

export type ButtonProps = LabelButtonProps | IconButtonProps;

const variantClass: Record<ButtonVariant, string> = {
  primary: cn(
    "bg-[var(--admin-accent)] text-[var(--admin-on-accent)] shadow-[shadow:var(--admin-shadow-sm)]",
    "active:bg-[var(--admin-accent-hover)] mouse-hover:bg-[var(--admin-accent-hover)]",
  ),
  secondary: cn(
    "border border-[var(--admin-border-strong)] bg-[var(--admin-surface)] text-[var(--admin-text)]",
    "active:bg-[var(--admin-surface-muted)] mouse-hover:bg-[var(--admin-surface-hover)]",
  ),
  ghost: cn(
    "bg-transparent text-[var(--admin-text)]",
    "active:bg-[var(--admin-surface-muted)] mouse-hover:bg-[var(--admin-surface-hover)]",
  ),
  danger: cn(
    "bg-[var(--admin-danger)] text-[var(--admin-on-accent)]",
    "active:opacity-90 mouse-hover:opacity-90",
  ),
  text: cn(
    "bg-transparent text-[var(--admin-accent)]",
    "active:bg-[var(--admin-accent-bg)] mouse-hover:underline mouse-hover:underline-offset-2",
  ),
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "min-h-[var(--admin-touch-min)] gap-1.5 rounded-[var(--admin-radius-md)] px-3 admin-type-caption font-medium",
  md: "min-h-[var(--admin-touch-min)] gap-2 rounded-[var(--admin-radius-md)] px-4 admin-type-body font-medium",
  lg: "min-h-[var(--admin-touch-large)] gap-2 rounded-[var(--admin-radius-lg)] px-5 admin-type-h3",
};

const iconOnlyClass: Record<ButtonSize, string> = {
  sm: "min-w-[var(--admin-touch-min)] px-0",
  md: "min-w-[var(--admin-touch-min)] px-0",
  lg: "min-w-[var(--admin-touch-large)] px-0",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(props, ref) {
  const {
    variant = "primary",
    size = "md",
    isLoading = false,
    iconOnly = false,
    ariaLabel,
    fullWidth,
    leadingIcon,
    trailingIcon,
    disabled,
    children,
    className,
    type,
    ...rest
  } = props;

  const spinner = <Loader2 size={size === "sm" ? 14 : 16} className="animate-spin" aria-hidden />;

  return (
    <button
      ref={ref}
      type={type ?? "button"}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      aria-label={ariaLabel}
      data-variant={variant}
      className={cn(
        "tap-scale inline-flex select-none items-center justify-center",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variantClass[variant],
        sizeClass[size],
        iconOnly ? iconOnlyClass[size] : null,
        fullWidth ? "w-full" : null,
        className,
      )}
      {...rest}
    >
      {iconOnly ? (
        isLoading ? spinner : children
      ) : (
        <>
          {isLoading ? spinner : leadingIcon}
          <span className="min-w-0 truncate">{children}</span>
          {isLoading ? null : trailingIcon}
        </>
      )}
    </button>
  );
});
