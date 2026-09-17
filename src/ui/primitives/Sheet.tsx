"use client";

import { Drawer } from "vaul";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  description?: ReactNode;
  /** Slot à droite du titre (menu « ⋯ »). */
  trailing?: ReactNode;
  /**
   * Barre fixe entre le titre et la zone qui défile — le champ de recherche
   * d'un sélecteur, qui ne doit pas partir avec la liste.
   */
  toolbar?: ReactNode;
  /** Bouton « Fermer » à gauche du titre (défaut true). */
  closeButton?: boolean;
  /** Poignée de glissement (défaut true). */
  handle?: boolean;
  /** Part de la hauteur visible, en % (défaut 92). */
  maxVh?: number;
  /**
   * `full` (défaut) : la sheet occupe toute la hauteur allouée. `auto` : elle
   * épouse son contenu — à réserver aux sheets minuscules, car une sheet à
   * mi-écran perd sa moitié haute dès que le clavier monte.
   */
  size?: "full" | "auto";
  /** Pied collant : le CTA de la sheet, au-dessus du clavier. */
  footer?: ReactNode;
  /**
   * `false` dès qu'un formulaire est modifié : on ne perd pas une saisie d'un
   * revers de pouce. La croix appelle toujours `onOpenChange(false)` — à
   * l'appelant de demander « Abandonner la saisie ? ».
   */
  dismissible?: boolean;
  /** Sheet ouverte depuis une autre sheet : couche `modal` (80/81). */
  nested?: boolean;
  children: ReactNode;
  className?: string;
};

/** Bottom sheet iOS (vaul). z 70/71 ; imbriquée 80/81. */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  trailing,
  toolbar,
  closeButton = true,
  handle = true,
  maxVh = 92,
  size = "full",
  footer,
  dismissible = true,
  nested = false,
  children,
  className,
}: SheetProps) {
  const Root = nested ? Drawer.NestedRoot : Drawer.Root;
  /*
   * Hauteur allouée = part visible souhaitée PLUS la hauteur du clavier.
   *
   * La sheet est ancrée au bas du viewport de mise en page, que le clavier iOS
   * ne rétrécit pas : ses derniers pixels passent sous le clavier, et le pied
   * les compense par une marge basse égale à l'inset. `--admin-vh` suit, lui,
   * le viewport VISUEL, déjà amputé du clavier — plafonner la sheet à cette
   * seule valeur retranchait le clavier une seconde fois et réduisait la zone
   * de contenu à quelques dizaines de pixels. `min(…, 100dvh)` garde le
   * garde-fou de l'écran plein.
   */
  const sheetHeight = `min(calc(var(--admin-vh, 100dvh) * ${maxVh / 100} + var(--admin-keyboard-inset, 0px)), 100dvh)`;

  return (
    <Root open={open} onOpenChange={onOpenChange} shouldScaleBackground={!nested} dismissible={dismissible}>
      <Drawer.Portal>
        <Drawer.Overlay
          className={cn(
            "admin-theme fixed inset-0 bg-[var(--admin-overlay)] backdrop-blur-sm",
            nested ? "z-[var(--admin-z-modal-backdrop)]" : "z-[var(--admin-z-sheet-backdrop)]",
          )}
        />
        <Drawer.Content
          className={cn(
            "admin-theme fixed inset-x-0 bottom-0 mx-auto flex max-w-[var(--admin-app-max-width)] flex-col outline-none",
            "rounded-t-[var(--admin-radius-xl)] bg-[var(--admin-surface)] shadow-[shadow:var(--admin-shadow-lg)]",
            nested ? "z-[var(--admin-z-modal)]" : "z-[var(--admin-z-sheet)]",
            className,
          )}
          style={{ ...(size === "full" ? { height: sheetHeight } : null), maxHeight: sheetHeight }}
        >
          {handle ? <div className="admin-sheet-handle" /> : null}

          {title || closeButton || trailing ? (
            <div className="flex items-center gap-2 border-b border-[var(--admin-border)] px-2 py-1">
              {closeButton ? (
                <Button variant="ghost" iconOnly ariaLabel="Fermer" onClick={() => onOpenChange(false)}>
                  <X size={18} className="text-[var(--admin-text-muted)]" />
                </Button>
              ) : (
                <span className="w-2 shrink-0" />
              )}
              <div className="min-w-0 flex-1 py-2">
                {title ? (
                  <Drawer.Title className="admin-type-h3 truncate text-[var(--admin-text)]">{title}</Drawer.Title>
                ) : null}
                {description ? (
                  <Drawer.Description className="admin-type-caption mt-0.5 line-clamp-2 text-[var(--admin-text-muted)]">
                    {description}
                  </Drawer.Description>
                ) : null}
              </div>
              {trailing ? <div className="shrink-0">{trailing}</div> : <span className="w-2 shrink-0" />}
            </div>
          ) : null}

          {toolbar ? <div className="shrink-0 border-b border-[var(--admin-border)] px-4 py-3">{toolbar}</div> : null}

          {/* `overflow-y-auto` : repère de l'invariant « sheet écrasée » (e2e/helpers/layoutInvariants.ts). */}
          <div
            className={cn(
              "flex-1 overflow-y-auto overscroll-contain px-4 [-webkit-overflow-scrolling:touch]",
              footer ? "pt-3" : "py-4",
            )}
            style={{
              paddingBottom: footer
                ? "var(--admin-space-3)"
                : "calc(var(--admin-space-4) + var(--admin-safe-area-bottom) + var(--admin-keyboard-inset, 0px))",
            }}
          >
            {children}
          </div>

          {footer ? (
            <div
              className="border-t border-[var(--admin-border)] bg-[var(--admin-surface)] px-4 pt-3"
              style={{
                paddingBottom: "var(--admin-sheet-footer-pad)",
                // Remonte le pied au-dessus du clavier ; la sheet reste ancrée au
                // bas du viewport de mise en page.
                marginBottom: "var(--admin-keyboard-inset, 0px)",
              }}
            >
              {footer}
            </div>
          ) : null}
        </Drawer.Content>
      </Drawer.Portal>
    </Root>
  );
}
