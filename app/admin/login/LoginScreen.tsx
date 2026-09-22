"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Info } from "lucide-react";
import { loginInput } from "@/contracts/auth";
import { useAction } from "@/app-shell/hooks/useAction";
import { PreprodBanner } from "@/app-shell/PreprodBanner";
import { SESSION_EXPIRED_MESSAGE, clearSessionHint } from "@/app-shell/session-hint";
import { ViewportService } from "@/app-shell/ViewportService";
import { loginAction } from "@/server/auth/actions";
import { ErrorBanner } from "@/ui/patterns/ErrorBanner";
import { FormField } from "@/ui/patterns/FormField";
import { Button } from "@/ui/primitives/Button";
import { Card } from "@/ui/primitives/Card";
import { Heading } from "@/ui/primitives/Heading";
import { Input } from "@/ui/primitives/Input";
import { Text } from "@/ui/primitives/Text";

type LoginScreenProps = {
  /** Écran à rouvrir après connexion (validé par le serveur, `safeReturnPath`). */
  retour?: string;
  /** Une session a expiré sur cet appareil : « Ta session a expiré… » (06 E18). */
  expired: boolean;
  preprod: boolean;
};

type FieldErrors = { username?: string; password?: string };

/** Le clavier iOS met ~300 ms à monter : on cadre le formulaire une fois qu'il est là. */
const KEYBOARD_RISE_MS = 320;

function keyboardInset(): number {
  const declared = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--admin-keyboard-inset"));
  const vv = window.visualViewport;
  const measured = vv ? window.innerHeight - vv.height - vv.offsetTop : 0;
  return Math.max(Number.isFinite(declared) ? declared : 0, measured, 0);
}

/**
 * Cadre le champ saisi et, si la place le permet, le bouton « Se connecter » juste au-dessus du
 * clavier : on tape, on voit où l'on tape, et l'on valide sans fermer le clavier.
 */
function reveal(scroller: HTMLElement, field: HTMLElement, cta: HTMLElement) {
  const box = scroller.getBoundingClientRect();
  const top = box.top + 12;
  const bottom = Math.min(box.bottom, window.innerHeight - keyboardInset()) - 12;
  const f = field.getBoundingClientRect();
  const c = cta.getBoundingClientRect();
  let delta = c.bottom > bottom ? c.bottom - bottom : 0;
  if (f.top - delta < top) delta = f.top - top;
  if (f.bottom - delta > bottom) delta = f.bottom - bottom;
  if (Math.abs(delta) < 1) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  scroller.scrollBy({ top: delta, behavior: reduced ? "auto" : "smooth" });
}

/**
 * E18 — Connexion (06 §3.6). Hors shell. Deux champs, un bouton, sous le pouce ; clavier ouvert,
 * le champ et le bouton restent visibles. Messages : refus indifférencié, blocage temporaire avec
 * sa durée réelle, expiration de session, absence de réseau.
 */
export function LoginScreen({ retour, expired, preprod }: LoginScreenProps) {
  const router = useRouter();
  const { run, pending } = useAction(loginAction, { errors: "inline" });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  const scrollerRef = useRef<HTMLElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);

  // Sans `retour`, l'écran n'a pas été ouvert par une expiration (déconnexion, visite directe) :
  // la prochaine visite ne parlera pas d'expiration.
  useEffect(() => {
    if (!retour) clearSessionHint();
  }, [retour]);

  const revealActive = useCallback(() => {
    const scroller = scrollerRef.current;
    const cta = ctaRef.current;
    const active = document.activeElement;
    if (!scroller || !cta || !(active instanceof HTMLInputElement) || !scroller.contains(active)) return;
    reveal(scroller, active.closest<HTMLElement>("[data-login-field]") ?? active, cta);
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let frame = 0;
    // Après le service viewport (même événement, image suivante).
    const onResize = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => window.requestAnimationFrame(revealActive));
    };
    vv.addEventListener("resize", onResize);
    return () => {
      vv.removeEventListener("resize", onResize);
      window.cancelAnimationFrame(frame);
    };
  }, [revealActive]);

  const onFieldFocus = () => {
    window.setTimeout(revealActive, KEYBOARD_RISE_MS);
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || leaving) return;
    setFormError(null);

    const checked = loginInput.safeParse({ username, password, retour });
    if (!checked.success) {
      const errors: FieldErrors = {};
      for (const issue of checked.error.issues) {
        const key = issue.path[0];
        if ((key === "username" || key === "password") && !errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      (errors.username ? usernameRef : passwordRef).current?.focus();
      return;
    }
    setFieldErrors({});

    const result = await run({ username, password, retour });
    if (result.ok) {
      setLeaving(true);
      router.replace(result.data.destination);
      return;
    }
    const { error } = result;
    // Un message rattaché à un champ va sous ce champ ; le refus indifférencié n'en désigne aucun.
    const onFields = { username: error.fields?.username, password: error.fields?.password };
    if (error.code === "VALIDATION" && (onFields.username || onFields.password)) {
      setFieldErrors(onFields);
      return;
    }
    if (error.code === "OFFLINE") {
      setFormError("Pas de connexion.");
      return;
    }
    setFormError(error.message);
    if (error.code === "VALIDATION") {
      // Refus : l'identifiant reste, le mot de passe se retape tout de suite.
      setPassword("");
      passwordRef.current?.focus();
    }
  }

  const busy = pending || leaving;

  return (
    <div className="admin-theme admin-paint admin-app-container">
      <ViewportService />
      {preprod ? <PreprodBanner /> : null}
      <main
        id="main-content"
        ref={scrollerRef}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
        style={{ paddingBottom: "calc(var(--admin-safe-area-bottom) + var(--admin-keyboard-inset, 0px))" }}
      >
        <div className="flex min-h-full shrink-0 flex-col justify-center gap-6 px-5 py-8">
          <div className="flex flex-col items-center gap-3">
            <Image
              src="/branding/monogram/np-free-bordeaux.webp"
              alt=""
              width={64}
              height={64}
              className="h-16 w-16 object-contain"
              priority
            />
            <Heading level={1} variant="h2" className="text-center">
              Nuréa Gestion
            </Heading>
          </div>

          {/* `post` : un envoi parti avant l'hydratation ne met jamais le mot de passe dans l'URL. */}
          <form method="post" onSubmit={submit} noValidate aria-label="Connexion">
            <Card padding={5} className="flex flex-col gap-4">
              {expired && !formError ? (
                <div role="status" className="flex items-start gap-2">
                  <Info size={16} className="mt-0.5 shrink-0 text-[var(--admin-info)]" aria-hidden />
                  <Text variant="caption" tone="info" className="font-medium">
                    {SESSION_EXPIRED_MESSAGE}
                  </Text>
                </div>
              ) : null}

              <div data-login-field>
                <FormField label="Identifiant" error={fieldErrors.username}>
                  {(field) => (
                    <Input
                      {...field}
                      ref={usernameRef}
                      name="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onFocus={onFieldFocus}
                      disableAutoScroll
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      enterKeyHint="next"
                      variant="elevated"
                    />
                  )}
                </FormField>
              </div>

              <div data-login-field>
                <FormField label="Mot de passe" error={fieldErrors.password}>
                  {(field) => (
                    <Input
                      {...field}
                      ref={passwordRef}
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={onFieldFocus}
                      disableAutoScroll
                      autoComplete="current-password"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      enterKeyHint="go"
                      variant="elevated"
                      className="pr-24"
                      trailingSlot={
                        <Button
                          variant="text"
                          size="sm"
                          aria-pressed={showPassword}
                          // Le champ garde le focus : le clavier ne se ferme pas.
                          onPointerDown={(e) => e.preventDefault()}
                          onClick={() => setShowPassword((shown) => !shown)}
                        >
                          {showPassword ? "Masquer" : "Afficher"}
                        </Button>
                      }
                    />
                  )}
                </FormField>
              </div>

              {formError ? <ErrorBanner message={formError} /> : null}

              <Button ref={ctaRef} type="submit" size="lg" fullWidth isLoading={busy}>
                Se connecter
              </Button>
            </Card>
          </form>
        </div>
      </main>
    </div>
  );
}
