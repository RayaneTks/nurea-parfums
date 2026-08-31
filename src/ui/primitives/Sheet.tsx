"use client";

import { Drawer } from "vaul";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Title affiché en haut de la sheet. */
  title?: ReactNode;
  /** Description optionnelle sous le title. */
  description?: ReactNode;
  /** Slot à droite du title (ex. menu …). */
  trailing?: ReactNode;
  /** Affiche un bouton close X à gauche du title (defaut true). */
  closeButton?: boolean;
  /** Affiche le drag handle iOS-style (defaut true). */
  handle?: boolean;
  /** Hauteur en vh (defaut 92). */
  maxVh?: number;
  /**
   * `full` (defaut) — la sheet occupe toute la hauteur allouée, quel que soit
   * son contenu. `auto` — elle se règle sur son contenu.
   *
   * Le défaut est `full` parce qu'une sheet qui épouse son contenu s'ouvre à
   * mi-écran : la moitié haute est perdue, et dès que le clavier monte il ne
   * reste presque rien pour le formulaire. Réserver `auto` aux sheets
   * réellement minuscules.
   */
  size?: "full" | "auto";
  /** Footer sticky (CTA principal). */
  footer?: ReactNode;
  /** Désactive le swipe-to-dismiss (utile en mode edit avec dirty). */
  dismissible?: boolean;
  /** Imbriquer dans une Sheet parente (utilise Drawer.NestedRoot de vaul). */
  nested?: boolean;
  children: ReactNode;
  className?: string;
};

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  trailing,
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
  /**
   * Hauteur allouée = part visible souhaitée PLUS la hauteur du clavier.
   *
   * La sheet est ancrée au bas du viewport de mise en page, que le clavier iOS
   * ne rétrécit pas : ses derniers pixels passent sous le clavier, et le pied
   * les compense par une marge basse égale à l'inset. `--admin-vh` suit lui le
   * viewport VISUEL, déjà amputé du clavier — sans ce rattrapage, on le
   * retrancherait deux fois.
   */
  const sheetHeight = `min(calc(var(--admin-vh, 100dvh) * ${maxVh / 100} + var(--admin-keyboard-inset, 0px)), 100dvh)`;
  return (
    <Root
      open={open}
      onOpenChange={onOpenChange}
      shouldScaleBackground={!nested}
      dismissible={dismissible}
    >
      <Drawer.Portal>
        <Drawer.Overlay
          className="admin-theme fixed inset-0 bg-black/40 backdrop-blur-sm"
          style={{ zIndex: nested ? 80 : 70 }}
        />
        <Drawer.Content
          className={cn(
            "admin-theme fixed inset-x-0 bottom-0 mx-auto flex flex-col rounded-t-[24px] bg-[var(--admin-surface)] outline-none",
            "max-w-[var(--admin-app-max-width)]",
            className,
          )}
          /**
           * Hauteur maximale = part visible souhaitée PLUS la hauteur du clavier.
           *
           * La sheet est ancrée en bas du viewport de mise en page, que le
           * clavier iOS ne rétrécit pas : ses derniers pixels passent donc sous
           * le clavier, et le pied les compense par une marge basse égale à
           * l'inset. Mais `--admin-vh` suit le viewport VISUEL, déjà amputé du
           * clavier — plafonner la sheet à cette valeur retranchait le clavier
           * une seconde fois et réduisait la zone de contenu à quelques dizaines
           * de pixels, jusqu'à masquer les résultats de recherche.
           *
           * `min(…, 100dvh)` garde le garde-fou de l'écran plein.
           */
          style={{
            // Même expression pour `height` et `max-height` : la sheet occupe
            // la hauteur allouée au lieu de s'ajuster à son contenu.
            ...(size === "full" ? { height: sheetHeight } : null),
            maxHeight: sheetHeight,
            zIndex: nested ? 81 : 71,
          }}
        >
          {handle ? <div className="admin-sheet-handle" /> : null}

          {title || closeButton || trailing ? (
            <div
              className="flex items-center gap-2 px-4 pb-3 pt-3"
              style={{ borderBottom: "1px solid var(--admin-border)" }}
            >
              {closeButton ? (
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  aria-label="Fermer"
                  className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--admin-text-muted)] tap-scale hover:bg-[var(--admin-surface-muted)]"
                >
                  <X size={18} />
                </button>
              ) : null}
              <div className="min-w-0 flex-1">
                {title ? (
                  <Drawer.Title className="text-[16px] font-semibold leading-tight text-[var(--admin-text)] truncate">
                    {title}
                  </Drawer.Title>
                ) : null}
                {description ? (
                  <Drawer.Description className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-[var(--admin-text-muted)]">
                    {description}
                  </Drawer.Description>
                ) : null}
              </div>
              {trailing ? <div className="shrink-0">{trailing}</div> : null}
            </div>
          ) : null}

          <div
            className={cn(
              "flex-1 overflow-y-auto overscroll-contain px-4 [-webkit-overflow-scrolling:touch]",
              footer ? "pt-3" : "py-4",
            )}
            style={{
              paddingBottom: footer
                ? "0.75rem"
                : "calc(1rem + env(safe-area-inset-bottom, 0px) + var(--admin-keyboard-inset, 0px))",
            }}
          >
            {children}
          </div>

          {footer ? (
            <div
              className="px-4 pt-3"
              style={{
                borderTop: "1px solid var(--admin-border)",
                paddingBottom: "var(--admin-sheet-footer-pad)",
                // Remonte le pied au-dessus du clavier : la sheet elle-même
                // reste ancrée au bas du viewport de mise en page.
                marginBottom: "var(--admin-keyboard-inset, 0px)",
                background: "var(--admin-surface)",
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
