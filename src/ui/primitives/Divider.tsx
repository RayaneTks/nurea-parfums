import { cn } from "@/lib/utils";

type DividerProps = {
  /** Mode hairline (defaut) ou full (épais). */
  weight?: "hairline" | "regular";
  /** Bleed = la barre traverse les paddings (utile dans Card / Sheet). */
  bleed?: boolean;
  className?: string;
};

export function Divider({ weight = "hairline", bleed = false, className }: DividerProps) {
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className={cn(
        bleed ? "-mx-5" : null,
        className,
      )}
      style={{
        height: weight === "hairline" ? 1 : 2,
        background: "var(--admin-border)",
      }}
    />
  );
}
