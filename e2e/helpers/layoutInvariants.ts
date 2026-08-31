import type { Page } from "@playwright/test";

export type Violation = {
  rule: string;
  detail: string;
  selector: string;
};

/**
 * Taille minimale d'une cible tactile avant échec.
 *
 * Les HIG iOS recommandent 44 px. On échoue sous 32 px — en dessous la cible
 * est franchement ratable — et on remonte l'écart 32–43 px en avertissement,
 * pour ne pas bloquer sur des contrôles secondaires assumés tout en gardant
 * l'information visible.
 */
export const TOUCH_FAIL_PX = 32;
export const TOUCH_WARN_PX = 44;

/**
 * Invariants mesurables sur l'écran tel qu'il s'affiche : géométrie et cibles.
 *
 * Le principe : plutôt que de relire chaque écran à l'œil après chaque
 * changement, on énonce une fois ce qui ne doit jamais arriver et on l'éprouve
 * sur toutes les routes, à toutes les largeurs.
 */
export async function collectLayoutViolations(page: Page): Promise<{
  violations: Violation[];
  warnings: Violation[];
}> {
  return page.evaluate(
    ({ touchFail, touchWarn }) => {
      const violations: Violation[] = [];
      const warnings: Violation[] = [];

      const describe = (el: Element): string => {
        const tag = el.tagName.toLowerCase();
        const id = el.id ? `#${el.id}` : "";
        const cls =
          typeof el.className === "string" && el.className
            ? `.${el.className.trim().split(/\s+/).slice(0, 3).join(".")}`
            : "";
        const text = (el.textContent ?? "").trim().slice(0, 40);
        return `${tag}${id}${cls}${text ? ` « ${text} »` : ""}`;
      };

      const isRendered = (el: Element): boolean => {
        const s = getComputedStyle(el);
        if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0") return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      };

      /**
       * Un champ « sr-only » est volontairement réduit à 1 px et masqué par
       * clip : il n'est jamais visé au doigt, seulement lu par les
       * technologies d'assistance.
       */
      const isVisuallyHidden = (el: Element): boolean => {
        const r = el.getBoundingClientRect();
        if (r.width <= 2 || r.height <= 2) return true;
        const s = getComputedStyle(el);
        if (s.clipPath && s.clipPath !== "none") return true;
        return (s.clip ?? "").replace(/\s/g, "") === "rect(0px,0px,0px,0px)";
      };

      /**
       * Le débordement se juge sur TOUTE la chaîne d'ancêtres : un chip dans
       * une rangée défilable déborde légitimement, et ses enfants aussi.
       */
      const hasClippingAncestor = (el: Element, stopAt: Element): boolean => {
        let cur: Element | null = el;
        while (cur && cur !== stopAt) {
          const o = getComputedStyle(cur).overflowX;
          if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") return true;
          cur = cur.parentElement;
        }
        return false;
      };

      // ─── Débordement horizontal ─────────────────────────────────────────
      // Une app mobile ne défile jamais latéralement : c'est le symptôme d'un
      // élément trop large qui rogne le reste de l'écran.
      if (document.documentElement.scrollWidth > window.innerWidth + 1) {
        violations.push({
          rule: "overflow-horizontal",
          detail: `La page défile latéralement (${document.documentElement.scrollWidth}px pour ${window.innerWidth}px).`,
          selector: "html",
        });
      }

      // ─── Éléments hors du cadre de l'app ────────────────────────────────
      const frame = document.querySelector(".admin-app-container");
      if (frame) {
        const f = frame.getBoundingClientRect();
        for (const el of Array.from(frame.querySelectorAll("*"))) {
          if (!isRendered(el)) continue;
          if (hasClippingAncestor(el, frame)) continue;
          const r = el.getBoundingClientRect();
          if (r.right > f.right + 1 || r.left < f.left - 1) {
            violations.push({
              rule: "hors-cadre",
              detail: `Déborde du cadre (${Math.round(r.left)}→${Math.round(r.right)} pour ${Math.round(f.left)}→${Math.round(f.right)}).`,
              selector: describe(el),
            });
          }
        }
      }

      // ─── Texte rogné sans ellipse ───────────────────────────────────────
      // `overflow: hidden` sans `text-overflow: ellipsis` coupe le mot net :
      // rien n'indique au lecteur qu'il manque du texte.
      for (const el of Array.from(document.querySelectorAll("*"))) {
        if (el.children.length > 0) continue;
        if (!isRendered(el)) continue;
        if (!(el.textContent ?? "").trim()) continue;
        const s = getComputedStyle(el);
        if (s.overflow !== "hidden" && s.overflowX !== "hidden") continue;
        if (s.textOverflow === "ellipsis") continue;
        if (s.webkitLineClamp && s.webkitLineClamp !== "none") continue;
        if (el.scrollWidth > el.clientWidth + 1) {
          violations.push({
            rule: "texte-rogne",
            detail: `Texte coupé sans ellipse (${el.scrollWidth}px dans ${el.clientWidth}px).`,
            selector: describe(el),
          });
        }
      }

      // ─── Cibles tactiles ────────────────────────────────────────────────
      const interactive = Array.from(
        document.querySelectorAll(
          'a[href], button:not(:disabled), input:not([type="hidden"]), select, textarea,' +
            ' [role="button"], [role="option"], [role="radio"], [role="tab"]',
        ),
      );
      for (const el of interactive) {
        if (!isRendered(el) || isVisuallyHidden(el)) continue;
        if (el.closest("[data-touch-exempt]")) continue;
        const r = el.getBoundingClientRect();
        const min = Math.min(r.width, r.height);
        const size = `Cible de ${Math.round(r.width)}×${Math.round(r.height)}px`;
        if (min < touchFail) {
          violations.push({
            rule: "cible-tactile",
            detail: `${size}, minimum ${touchFail}px.`,
            selector: describe(el),
          });
        } else if (min < touchWarn) {
          warnings.push({
            rule: "cible-tactile-limite",
            detail: `${size}, recommandé ${touchWarn}px.`,
            selector: describe(el),
          });
        }
      }

      return { violations, warnings };
    },
    { touchFail: TOUCH_FAIL_PX, touchWarn: TOUCH_WARN_PX },
  ) as Promise<{ violations: Violation[]; warnings: Violation[] }>;
}

/**
 * Invariant vérifiable UNIQUEMENT en fin de défilement.
 *
 * La barre d'onglets recouvre la zone de défilement : en cours de route des
 * contrôles passent dessous, c'est normal — on fait défiler pour les
 * atteindre. Ce qui ne doit jamais arriver, c'est qu'ils y restent une fois le
 * bas atteint : signe que la réserve basse (`--admin-scroll-bottom-pad`)
 * manque sur cet écran.
 */
export async function collectBottomOcclusion(page: Page): Promise<Violation[]> {
  return page.evaluate(() => {
    const out: Violation[] = [];
    const tabBar = document.querySelector("[data-tabbar]");
    const scroller = document.getElementById("admin-scroll-root");
    if (!tabBar || !scroller) return out;

    // Sans débordement il n'y a rien à faire défiler : la réserve basse ne se
    // prouve que sur une page plus longue que l'écran.
    if (scroller.scrollHeight <= scroller.clientHeight + 1) return out;

    const describe = (el: Element): string => {
      const cls =
        typeof el.className === "string" && el.className
          ? `.${el.className.trim().split(/\s+/).slice(0, 3).join(".")}`
          : "";
      const text = (el.textContent ?? "").trim().slice(0, 40);
      return `${el.tagName.toLowerCase()}${cls}${text ? ` « ${text} »` : ""}`;
    };

    const t = tabBar.getBoundingClientRect();
    const interactive = Array.from(
      document.querySelectorAll<HTMLElement>(
        'a[href], button:not(:disabled), input:not([type="hidden"]), select, textarea, [role="button"], [role="option"]',
      ),
    );
    for (const el of interactive) {
      if (tabBar.contains(el)) continue;
      if (el.closest("[data-sticky-action]")) continue;
      if (getComputedStyle(el).position === "fixed") continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 2 || r.height <= 2) continue;
      const centerY = r.top + r.height / 2;
      if (centerY > t.top && centerY < t.bottom) {
        out.push({
          rule: "sous-la-barre-onglets",
          detail: `Reste masqué par la barre d'onglets en fin de défilement (centre à ${Math.round(centerY)}px, barre à ${Math.round(t.top)}px).`,
          selector: describe(el),
        });
      }
    }
    return out;
  }) as Promise<Violation[]>;
}

/**
 * Simule l'ouverture du clavier iOS.
 *
 * Le vrai clavier ne rétrécit pas le viewport de mise en page : il n'est
 * visible que par `visualViewport`, que `ViewportSync` reporte dans
 * `--admin-vh` et `--admin-keyboard-inset`. Forcer ces deux variables
 * reproduit fidèlement la contrainte que subit la mise en page.
 */
export async function simulateKeyboard(page: Page, keyboardHeight = 336): Promise<void> {
  await page.evaluate((kb) => {
    const root = document.documentElement;
    root.style.setProperty("--admin-keyboard-inset", `${kb}px`);
    root.style.setProperty("--admin-vh", `${window.innerHeight - kb}px`);
  }, keyboardHeight);
  await page.waitForTimeout(200);
}

/**
 * Contrôles qui doivent rester atteignables clavier ouvert : le champ actif et
 * l'action principale. Un CTA sous le clavier bloque la saisie en cours.
 */
export async function collectKeyboardViolations(
  page: Page,
  keyboardHeight = 336,
): Promise<Violation[]> {
  return page.evaluate((kb) => {
    const out: Violation[] = [];
    const keyboardTop = window.innerHeight - kb;
    const label = (el: Element) => {
      const text = (el.textContent ?? "").trim().slice(0, 40);
      return `${el.tagName.toLowerCase()}${text ? ` « ${text} »` : ""}`;
    };

    const focused = document.activeElement;
    if (focused && focused !== document.body) {
      const r = focused.getBoundingClientRect();
      if (r.height > 0 && r.bottom > keyboardTop + 1) {
        out.push({
          rule: "champ-sous-clavier",
          detail: `Le champ saisi passe sous le clavier (bas à ${Math.round(r.bottom)}px, clavier à ${Math.round(keyboardTop)}px).`,
          selector: label(focused),
        });
      }
    }

    for (const el of Array.from(
      document.querySelectorAll<HTMLElement>(
        "[data-sticky-action] button, [data-sticky-action] a",
      ),
    )) {
      const r = el.getBoundingClientRect();
      if (r.height === 0) continue;
      if (r.bottom > keyboardTop + 1) {
        out.push({
          rule: "cta-sous-clavier",
          detail: `L'action principale passe sous le clavier (bas à ${Math.round(r.bottom)}px).`,
          selector: label(el),
        });
      }
    }

    // Une sheet ouverte doit garder une zone de contenu exploitable : c'est
    // exactement ce qui manquait au sélecteur de client, réduit à ~24 px.
    const sheet = document.querySelector("[data-vaul-drawer]");
    if (sheet && getComputedStyle(sheet).transform === "none") {
      const body = Array.from(sheet.children).find((el) =>
        el.className.toString().includes("overflow-y-auto"),
      );
      if (body) {
        const h = body.getBoundingClientRect().height;
        if (h < 120) {
          out.push({
            rule: "sheet-ecrasee",
            detail: `Zone de contenu de la sheet réduite à ${Math.round(h)}px clavier ouvert.`,
            selector: "[data-vaul-drawer]",
          });
        }
      }
    }

    return out;
  }, keyboardHeight) as Promise<Violation[]>;
}

/**
 * Vérifie que React a bien pris la main sur le HTML rendu par le serveur.
 *
 * Un écran non hydraté s'affiche parfaitement et ne réagit à rien : onglets
 * inertes, boutons sans effet. Aucune mesure de mise en page ne le détecte, et
 * c'est invisible à la relecture d'une capture — d'où cet invariant à part.
 *
 * Cause la plus fréquente ici : `useSearchParams()` dans un composant client
 * sans frontière `<Suspense>` au-dessus (voir CLAUDE.md).
 */
export async function collectHydrationViolations(page: Page): Promise<Violation[]> {
  return page.evaluate(() => {
    const out: Violation[] = [];

    const isAttached = (el: Element | null): boolean =>
      !!el && Object.keys(el).some((k) => k.startsWith("__react"));

    // La barre d'onglets est un composant client présent sur tout écran de
    // l'app : si elle n'est pas hydratée, rien ne l'est.
    const tabBarLink = document.querySelector("[data-tabbar] a");
    if (tabBarLink && !isAttached(tabBarLink)) {
      out.push({
        rule: "non-hydrate",
        detail: "React n'a pas repris la main : les contrôles de l'écran sont inertes.",
        selector: "[data-tabbar] a",
      });
      return out;
    }

    // Contrôles à état local : ils doivent répondre au doigt.
    const control = document.querySelector('[role="radio"], [aria-haspopup="dialog"]');
    if (control && !isAttached(control)) {
      out.push({
        rule: "non-hydrate",
        detail: "Contrôle interactif sans gestionnaire React : cliquer ne fera rien.",
        selector: control.tagName.toLowerCase() + ` « ${(control.textContent ?? "").trim().slice(0, 30)} »`,
      });
    }

    return out;
  }) as Promise<Violation[]>;
}
