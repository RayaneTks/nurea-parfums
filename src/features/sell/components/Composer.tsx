"use client";

import { Boxes, MoreHorizontal, Plus, Search, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useConfirm, useToast } from "@/app-shell/FeedbackProvider";
import { routes } from "@/app-shell/routes";
import { useShellSheet } from "@/app-shell/SheetRegistry";
import { useAction } from "@/app-shell/hooks/useAction";
import { useReadRoute } from "@/app-shell/hooks/useReadRoute";
import type { BatchSummary } from "@/contracts/batches";
import type { PickerCatalogue, PickerPerfume } from "@/contracts/catalogue";
import type { RecentlySoldDTO } from "@/contracts/documents";
import type { SettingsSummary } from "@/contracts/settings";
import type { PocketSummary } from "@/contracts/treasury";
import { eur, formatEur, halfForCash, parseEurInput, type Eur } from "@/domain/money";
import { cn } from "@/lib/utils";
import { BatchPicker } from "@/features/documents/components/BatchPicker";
import { CustomerPicker } from "@/features/documents/components/CustomerPicker";
import { DeliveryChips } from "@/features/documents/components/DeliveryChips";
import { LineCard } from "@/features/documents/components/LineCard";
import { PerfumePicker } from "@/features/documents/components/PerfumePicker";
import { PocketChips } from "@/features/documents/components/PocketChips";
import { errorsByLine, stockBadgeOf, withArrivedPricing, withVolume, type LineDraft } from "@/features/documents/components/line-draft";
import { useTransientSheet } from "@/features/documents/components/useTransientSheet";
import { createDocumentAction } from "@/server/documents/actions";
import { CollapsibleSection } from "@/ui/patterns/CollapsibleSection";
import { FormField } from "@/ui/patterns/FormField";
import { Money } from "@/ui/patterns/Money";
import { Button } from "@/ui/primitives/Button";
import { Card } from "@/ui/primitives/Card";
import { Chip } from "@/ui/primitives/Chip";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { ListRow } from "@/ui/primitives/ListRow";
import { MoneyInput, amountToInputText } from "@/ui/primitives/MoneyInput";
import { SegmentedControl } from "@/ui/primitives/SegmentedControl";
import { Sheet } from "@/ui/primitives/Sheet";
import { StickyAction } from "@/ui/primitives/StickyAction";
import { Text } from "@/ui/primitives/Text";
import { Textarea } from "@/ui/primitives/Textarea";
import {
  applyParams,
  articlesLabel,
  chosenPocket,
  confirmationOf,
  createInput,
  ctaPlan,
  customerDisplay,
  hasCustomerName,
  hasParams,
  isDraftEmpty,
  marginText,
  paymentsOf,
  pocketsLabel,
  quantitiesByPerfume,
  receivedOf,
  receivedText,
  resolveBatch,
  total as totalOf,
  withMode,
  withOffCatalogLine,
  withPerfume,
  withReceived,
  type ComposerDraft,
  type ComposerParams,
  type Confirmation,
  type LineSources,
} from "./composer-model";
import { ConfirmationCard } from "./ConfirmationCard";
import { RecentProvider, type RecentContextValue } from "./RecentlySold";
import { SplitSheet } from "./SplitSheet";
import { useComposerDraft } from "./useComposerDraft";

export type ComposerProps = {
  pockets: PocketSummary[];
  batches: BatchSummary[];
  settings: SettingsSummary;
  /** Version du sélecteur de ligne, pour `GET /api/admin/picker?v=` (04 §3.5). */
  pickerVersion: string;
  /** Parfums au catalogue : 0 ⇒ « Ajoute d'abord un parfum ». */
  catalogueCount: number;
  /** Paramètres d'URL vérifiés par le serveur, à usage unique. */
  params: ComposerParams;
  /** Bloc streamé « Vendus récemment » (seule la grille a un squelette). */
  recent: ReactNode;
};

const MODES = [
  { value: "vente", label: "Vente" },
  { value: "commande", label: "Commande" },
] as const;

const BANKNOTES = [20, 50, 100] as const;

type Given = { kind: "bill"; amount: number } | { kind: "other"; text: string } | null;

/**
 * E11 — Composeur Vendre (06 §3.3) : une vente directe ou une commande, pré-remplie par toutes les mémoires de
 * l'app (vendus récemment, prix appris, taux et poche par défaut, lot ouvert). Brouillon sur l'appareil, identifiant
 * de document généré ici : un renvoi n'écrit jamais deux fois. Après l'écriture, on reste ici, vidé, avec la carte
 * de confirmation.
 */
export function Composer({ pockets, batches, settings, pickerVersion, catalogueCount, params, recent }: ComposerProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { draft, update, reset, peek } = useComposerDraft();
  const picker = useReadRoute<PickerCatalogue>(`/api/admin/picker?v=${encodeURIComponent(pickerVersion)}`);
  const [recentItems, setRecentItems] = useState<readonly RecentlySoldDTO[]>([]);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [pendingParams, setPendingParams] = useState<ComposerParams | null>(null);
  const [perfumeOpen, setPerfumeOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openCost, setOpenCost] = useState<string | null>(null);
  const [given, setGiven] = useState<Given>(null);
  const split = useTransientSheet<true>();
  const priceRefs = useRef(new Map<string, HTMLInputElement | null>());
  const cardRefs = useRef(new Map<string, HTMLDivElement | null>());
  const receivedRef = useRef<HTMLInputElement | null>(null);
  const submitted = useRef<ComposerDraft | null>(null);

  const ctx = useMemo(() => ({ pockets, batches }), [pockets, batches]);
  const sources: LineSources = useMemo(
    () => ({ perfumes: picker.data?.perfumes ?? null, recent: recentItems, defaultRate: settings.defaultExchangeRate }),
    [picker.data, recentItems, settings.defaultExchangeRate],
  );
  const sourcesRef = useRef(sources);
  useEffect(() => {
    sourcesRef.current = sources;
  }, [sources]);

  const order = draft.mode === "commande";
  const hasLines = draft.lines.length > 0;
  const perfumeOf = useCallback((id: number | null): PickerPerfume | undefined => (id === null ? undefined : picker.data?.perfumes.find((p) => p.id === id)), [picker.data]);

  // ── Paramètres d'URL : consommés une fois dans le brouillon, puis retirés de l'URL (06 E11) ──
  const applied = useRef<string | null>(null);
  const paramsKey = hasParams(params)
    ? JSON.stringify([params.mode, params.prefill?.customer?.id, params.prefill?.perfume?.id, params.prefill?.source?.id])
    : null;
  useEffect(() => {
    if (paramsKey === null) {
      applied.current = null;
      return;
    }
    if (applied.current === paramsKey) return;
    applied.current = paramsKey;
    const current = peek();
    const onlyMode = params.prefill === null || (!params.prefill.customer && !params.prefill.perfume && !params.prefill.source);
    if (isDraftEmpty(current)) {
      update((d) => applyParams(d, params, sourcesRef.current));
      setConfirmation(null);
    } else if (!(onlyMode && params.mode === current.mode)) {
      setPendingParams(params);
    }
    /*
     * Paramètres retirés de l'adresse SANS aller-retour serveur (`window.history`, pris en charge par Next) : ils ont
     * été consommés dans le brouillon, un rechargement ne doit pas les rejouer — et le composeur n'a rien à relire.
     */
    window.history.replaceState(null, "", routes.vendre());
    // Les paramètres sont lus une fois par clé : `params` change d'identité à chaque rendu du serveur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  // La mémoire de prix arrive après une ligne posée trop tôt (tuile tapée avant la lecture du sélecteur).
  useEffect(() => {
    if (!picker.data || !draft.lines.some((line) => line.awaitingPricing)) return;
    update((d) => ({
      ...d,
      lines: d.lines.map((line) =>
        line.awaitingPricing
          ? withArrivedPricing(line, perfumeOf(line.perfumeId)?.pricing.find((row) => row.volumeMl === line.volumeMl), settings.defaultExchangeRate)
          : line,
      ),
    }));
  }, [picker.data, draft.lines, update, perfumeOf, settings.defaultExchangeRate]);

  // ── Gestes sur le brouillon ──
  const addPerfume = useCallback(
    (perfume: { id: number; name: string; brandName: string; image: string }) => {
      setConfirmation(null);
      update((d) => withPerfume(d, perfume, sourcesRef.current));
    },
    [update],
  );

  const replaceLine = (next: LineDraft) =>
    update((d) => ({
      ...d,
      lines: d.lines.map((line) => {
        if (line.id !== next.id) return line;
        const repriced = next.price !== line.price || next.cost !== line.cost || next.rate !== line.rate || next.volumeMl !== line.volumeMl;
        return repriced ? { ...next, awaitingPricing: undefined } : next;
      }),
    }));

  const removeLine = (line: LineDraft) => {
    const index = draft.lines.findIndex((candidate) => candidate.id === line.id);
    update((d) => ({ ...d, lines: d.lines.filter((candidate) => candidate.id !== line.id) }));
    showToast({
      type: "info",
      message: "Ligne retirée",
      actionLabel: "Annuler",
      onAction: () => update((d) => ({ ...d, lines: [...d.lines.slice(0, index), line, ...d.lines.slice(index)] })),
    });
  };

  const register = useCallback((items: readonly RecentlySoldDTO[]) => setRecentItems(items), []);
  const quantities = useMemo(() => quantitiesByPerfume(draft.lines), [draft.lines]);
  const recentValue = useMemo<RecentContextValue>(
    () => ({
      lineCount: draft.lines.length,
      quantities,
      perfumeOf: (id) => perfumeOf(id),
      add: (item) => addPerfume({ id: item.perfumeId, name: item.name, brandName: item.brandName, image: item.image }),
      register,
    }),
    [draft.lines.length, quantities, perfumeOf, addPerfume, register],
  );

  // ── Écriture (T1) ──
  const create = useAction(createDocumentAction, {
    onSuccess: (summary) => {
      const snapshot = submitted.current ?? draft;
      setConfirmation(confirmationOf(snapshot, summary, ctx));
      setGiven(null);
      setOpenCost(null);
      // Remis à zéro en mode Vente (06 E11 « Brouillon ») : une commande prise, le composeur revient à la vente.
      reset("vente");
      document.getElementById("admin-scroll-root")?.scrollTo({ top: 0, behavior: "smooth" });
    },
  });
  const lineErrors = errorsByLine(create.error, draft.lines);
  const fieldError = (key: string) => create.error?.fields?.[key];

  const plan = ctaPlan(draft, ctx);
  const onCta = () => {
    switch (plan.kind) {
      case "hidden":
        return;
      case "line": {
        if (plan.field === "price") priceRefs.current.get(plan.lineId)?.focus();
        if (plan.field === "rate") setOpenCost(plan.lineId);
        cardRefs.current.get(plan.lineId)?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      case "customer":
        setCustomerOpen(true);
        return;
      case "perfume":
        setPerfumeOpen(true);
        return;
      case "received":
        receivedRef.current?.focus();
        return;
      case "clamp":
        update((d) => withReceived(d, amountToInputText(plan.amount), plan.amount));
        return;
      case "submit":
        submitted.current = draft;
        void create.run(createInput(draft, ctx));
        return;
    }
  };

  // ── Lectures d'écran ──
  const sum = totalOf(draft);
  const received = receivedOf(draft);
  const payments = paymentsOf(draft, pockets);
  const pocket = chosenPocket(draft, pockets);
  const batch = resolveBatch(draft, batches);
  const margin = marginText(draft);
  const due = received === null ? null : eur.clampZero(eur.sub(sum, received));
  const customerRequired = order ? !hasCustomerName(draft) : due !== null && eur.compare(due, eur.zero) > 0 && !hasCustomerName(draft);
  const showSecondary = order || hasLines || draft.customer.kind === "linked" || !isDraftEmpty(draft);
  const splitActive = payments.length > 1;
  const realPockets = pockets.filter((p) => !p.isSystem);
  const paid = received !== null && eur.compare(received, eur.zero) > 0;

  const quickAmounts: { label: string; amount: Eur }[] = order
    ? [
        { label: "Rien", amount: eur.zero },
        { label: "La moitié", amount: halfForCash(sum) },
        { label: "Tout", amount: sum },
      ]
    : [
        { label: "Tout", amount: sum },
        { label: "La moitié", amount: halfForCash(sum) },
        { label: "Rien", amount: eur.zero },
      ];

  const givenAmount = given?.kind === "bill" ? (parseEurInput(String(given.amount)) ?? null) : given?.kind === "other" ? parseEurInput(given.text) : null;
  const change = givenAmount !== null && received !== null ? eur.sub(givenAmount, received) : null;

  const clearTicket = async () => {
    setMenuOpen(false);
    if (hasLines) {
      const customer = draft.customer.kind === "linked" || draft.customer.name.trim() ? " et le client saisis seront retirés." : " seront retirés.";
      const ok = await confirm({
        title: "Vider le ticket ?",
        description: `Les ${articlesLabel(draft.lines)}${customer}`,
        confirmLabel: "Vider",
        tone: "danger",
      });
      if (!ok) return;
    }
    reset(draft.mode);
    setGiven(null);
  };
  useShellSheet(menuOpen, () => setMenuOpen(false));

  return (
    <RecentProvider value={recentValue}>
      <div className="flex flex-col gap-4" data-composer data-mode={draft.mode}>
        {/* Zone 1 — en-tête collant : Vente | Commande, « ⋯ » */}
        <div className="admin-header-blur sticky top-0 z-[var(--admin-z-page-header)] -mx-4 -mt-3 flex items-center gap-2 px-4 pb-2 pt-3">
          <SegmentedControl
            ariaLabel="Vente ou commande"
            options={MODES}
            value={draft.mode}
            onChange={(mode) => update((d) => withMode(d, mode))}
            className="flex-1"
          />
          {!isDraftEmpty(draft) ? (
            <Button variant="ghost" iconOnly ariaLabel="Plus d'actions sur le ticket" onClick={() => setMenuOpen(true)}>
              <MoreHorizontal size={20} />
            </Button>
          ) : null}
        </div>

        {/* Zone 2 — bandeau de reprise */}
        {pendingParams ? (
          <Card tone="muted" padding={3}>
            <div className="flex flex-col gap-2" role="status" data-resume-banner>
              <Text variant="bodyEm">Un ticket est en cours ({articlesLabel(draft.lines)}).</Text>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" size="sm" onClick={() => setPendingParams(null)}>
                  Continuer ce ticket
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const next = pendingParams;
                    setPendingParams(null);
                    setConfirmation(null);
                    reset("vente");
                    update((d) => applyParams(d, next, sourcesRef.current));
                  }}
                >
                  Nouveau ticket
                </Button>
              </div>
            </div>
          </Card>
        ) : null}

        {/* Zone 3 — carte de confirmation */}
        {confirmation ? (
          // Une clé par document : la carte d'une nouvelle vente repart d'identifiants de remboursement neufs.
          <ConfirmationCard
            key={confirmation.documentId}
            confirmation={confirmation}
            onDismiss={() => setConfirmation(null)}
            onRestore={setConfirmation}
          />
        ) : null}

        {/* Zone 4 — client */}
        {showSecondary ? (
          <div className="flex flex-col gap-1">
            <Card padding={0} className={customerRequired ? "border-[var(--admin-warning)]" : undefined}>
              <ListRow
                leading={<UserRound size={20} aria-hidden className={customerRequired ? "text-[var(--admin-warning)]" : "text-[var(--admin-text-muted)]"} />}
                primary={customerDisplay(draft.customer)}
                secondary={
                  customerRequired ? (
                    <span className="text-[var(--admin-warning)]">Client requis</span>
                  ) : draft.customer.kind === "linked" ? (
                    (draft.customer.contact ?? undefined)
                  ) : (
                    draft.customer.contact.trim() || undefined
                  )
                }
                chevron
                ariaLabel={`Client : ${customerDisplay(draft.customer)}`}
                onClick={() => setCustomerOpen(true)}
              />
            </Card>
            {fieldError("customer") ? (
              <Text variant="caption" tone="danger">
                {fieldError("customer")}
              </Text>
            ) : null}
          </div>
        ) : null}

        {/* Zone 5 — articles */}
        <section className="flex flex-col gap-3" aria-label="Articles">
          {draft.lines.map((line) => (
            <LineCard
              key={line.id}
              line={line}
              pricing={perfumeOf(line.perfumeId)?.pricing.find((row) => row.volumeMl === line.volumeMl)}
              badge={stockBadgeOf(perfumeOf(line.perfumeId))}
              caption={line.brandName ?? undefined}
              errors={lineErrors.get(line.id)}
              costOpen={openCost === line.id}
              onChange={replaceLine}
              onVolume={(volumeMl) =>
                replaceLine(withVolume(line, volumeMl, perfumeOf(line.perfumeId)?.pricing.find((row) => row.volumeMl === volumeMl)))
              }
              onRemove={() => removeLine(line)}
              priceRef={(el) => void priceRefs.current.set(line.id, el)}
              cardRef={(el) => void cardRefs.current.set(line.id, el)}
            />
          ))}

          {catalogueCount === 0 && !hasLines ? (
            <EmptyState
              title="Ajoute d'abord un parfum"
              description="Un article hors catalogue reste possible par la recherche."
              action={
                <Button variant="secondary" leadingIcon={<Plus size={16} />} onClick={() => router.push(routes.nouveauParfum())}>
                  Ajouter un parfum
                </Button>
              }
            />
          ) : (
            recent
          )}

          <button
            type="button"
            onClick={() => setPerfumeOpen(true)}
            className={cn(
              "tap-scale flex min-h-[var(--admin-touch-min)] w-full items-center gap-2 rounded-[var(--admin-radius-md)] border border-[var(--admin-border-strong)] bg-[var(--admin-surface)] px-3 text-left",
              "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
            )}
          >
            <Search size={16} aria-hidden className="text-[var(--admin-text-subtle)]" />
            <span className="admin-type-field text-[var(--admin-text-subtle)]">Rechercher un parfum</span>
          </button>
          {fieldError("lines") ? (
            <Text variant="caption" tone="danger">
              {fieldError("lines")}
            </Text>
          ) : null}
        </section>

        {/* Zone 6 — commande : livraison prévue, notes */}
        {order ? (
          <div className="flex flex-col gap-3">
            <DeliveryChips
              value={draft.deliveryDay}
              onChange={(day) => update((d) => ({ ...d, deliveryDay: day, deliveryTime: day === null ? "" : d.deliveryTime }))}
              time={{ value: draft.deliveryTime, onChange: (time) => update((d) => ({ ...d, deliveryTime: time })) }}
            />
            {fieldError("expectedDeliveryAt") ? (
              <Text variant="caption" tone="danger">
                {fieldError("expectedDeliveryAt")}
              </Text>
            ) : null}
            <CollapsibleSection title="Notes" summary={draft.notes.trim() || undefined} defaultOpen={draft.notes.trim() !== ""}>
              <FormField label="Notes de la commande" error={fieldError("notes")}>
                {(field) => (
                  <Textarea
                    {...field}
                    value={draft.notes}
                    onChange={(e) => {
                      const notes = e.target.value;
                      update((d) => ({ ...d, notes }));
                    }}
                    rows={2}
                    maxLength={2000}
                    placeholder="Adresse, préférence, rappel…"
                  />
                )}
              </FormField>
            </CollapsibleSection>
          </div>
        ) : null}

        {/* Zone 7 — lot (N9), affiché en clair */}
        {showSecondary ? (
          <Card padding={0}>
            <ListRow
              leading={<Boxes size={20} aria-hidden className="text-[var(--admin-text-muted)]" />}
              primary={`Lot : ${batch?.name ?? "Sans lot"}`}
              chevron
              onClick={() => setBatchOpen(true)}
            />
          </Card>
        ) : null}

        {/* Zone 8 — paiement */}
        {order || hasLines ? (
          <Card padding={4}>
            <div className="flex flex-col gap-4" data-payment-block>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-baseline justify-between gap-3">
                  <Text variant="caption" tone="muted" className="font-semibold">
                    Total
                  </Text>
                  <Money value={sum} bold className="admin-type-h2" />
                </div>
                {hasLines ? (
                  <Text variant="caption" tone={margin.unknown ? "warning" : "muted"} className="tnum" align="right">
                    {margin.text}
                  </Text>
                ) : null}
              </div>

              <FormField label={order ? "Acompte" : "Reçu maintenant"} error={fieldError("payments")}>
                {(field) => (
                  <MoneyInput
                    ref={receivedRef}
                    {...field}
                    value={receivedText(draft)}
                    onChange={(text, amount) => update((d) => withReceived(d, text, amount))}
                    onFocus={(e) => e.currentTarget.select()}
                    // Sans article, le total vaut 0 : plafonner la saisie n'apprendrait rien (« 0,00 € au maximum »).
                    max={hasLines ? sum : undefined}
                    quickAmounts={hasLines ? quickAmounts : undefined}
                    enterKeyHint="done"
                  />
                )}
              </FormField>

              {paid ? (
                splitActive ? (
                  <div className="flex flex-col gap-1">
                    <Text variant="caption" tone="muted" className="font-semibold">
                      Poches
                    </Text>
                    <Text variant="body" className="tnum">
                      {pocketsLabel(payments)}
                    </Text>
                    <Button variant="text" size="sm" onClick={() => split.show(true)} className="self-start">
                      Modifier la répartition
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <PocketChips pockets={pockets} value={pocket?.id ?? null} onChange={(id) => update((d) => ({ ...d, pocketId: id, split: null }))} />
                    {realPockets.length >= 2 ? (
                      <Button variant="text" size="sm" onClick={() => split.show(true)} className="self-start">
                        Plusieurs poches…
                      </Button>
                    ) : null}
                  </div>
                )
              ) : null}

              {paid && !splitActive && pocket?.kind === "CASH" && received !== null ? (
                <div className="flex flex-col gap-2" role="group" aria-label="Donné en espèces">
                  <Text variant="caption" tone="muted" className="font-semibold">
                    Donné en espèces
                  </Text>
                  <div className="flex flex-wrap gap-2">
                    {BANKNOTES.filter((bill) => eur.compare(parseEurInput(String(bill)) ?? eur.zero, received) >= 0).map((bill) => (
                      <Chip
                        key={bill}
                        active={given?.kind === "bill" && given.amount === bill}
                        onClick={() => setGiven(given?.kind === "bill" && given.amount === bill ? null : { kind: "bill", amount: bill })}
                      >
                        {formatEur(parseEurInput(String(bill)) ?? eur.zero, { compact: true })}
                      </Chip>
                    ))}
                    <Chip active={given?.kind === "other"} onClick={() => setGiven(given?.kind === "other" ? null : { kind: "other", text: "" })}>
                      Autre
                    </Chip>
                  </div>
                  {given?.kind === "other" ? (
                    <FormField label="Donné en espèces">
                      {(field) => (
                        <MoneyInput {...field} value={given.text} onChange={(text) => setGiven({ kind: "other", text })} enterKeyHint="done" />
                      )}
                    </FormField>
                  ) : null}
                  {change !== null && !eur.isNegative(change) ? (
                    <Text variant="bodyEm" className="tnum">
                      À rendre {formatEur(change)}
                    </Text>
                  ) : null}
                </div>
              ) : null}
            </div>
          </Card>
        ) : null}

        {/* Zone 9 — action principale */}
        {plan.kind !== "hidden" ? (
          <StickyAction summary={plan.summary}>
            <Button variant="primary" size="lg" fullWidth isLoading={create.pending} onClick={onCta} data-composer-cta>
              {plan.label}
            </Button>
          </StickyAction>
        ) : null}
      </div>

      <PerfumePicker
        open={perfumeOpen}
        onOpenChange={setPerfumeOpen}
        nested={false}
        title="Rechercher un parfum"
        catalogue={picker.data}
        loading={picker.loading}
        error={picker.error ? { message: "Catalogue indisponible.", onRetry: picker.reload } : null}
        recent={recentItems}
        inDocument={quantities}
        onPick={(perfume) => addPerfume(perfume)}
        onOffCatalog={({ name, brandName }) => {
          setConfirmation(null);
          update((d) => withOffCatalogLine(d, name, brandName, settings.defaultExchangeRate));
        }}
      />
      <CustomerPicker
        open={customerOpen}
        onOpenChange={setCustomerOpen}
        nested={false}
        title="Client"
        passing={{
          name: draft.customer.kind === "passing" ? draft.customer.name : "",
          contact: draft.customer.kind === "passing" ? draft.customer.contact : "",
          nameRequired: customerRequired || order,
          onSubmit: (name, contact) => update((d) => ({ ...d, customer: { kind: "passing", name, contact } })),
        }}
        onSelect={(id, details) =>
          update((d) => ({ ...d, customer: { kind: "linked", id, fullName: details?.fullName ?? "Client", contact: details?.contact ?? null } }))
        }
      />
      <BatchPicker
        open={batchOpen}
        onOpenChange={setBatchOpen}
        nested={false}
        batches={batches}
        value={batch?.id ?? null}
        onSelect={(id, name) => update((d) => ({ ...d, batch: { kind: "chosen", id, name } }))}
      />
      {split.subject && received !== null ? (
        <SplitSheet
          key={split.key}
          open={split.open}
          onClose={split.hide}
          received={received}
          pockets={pockets}
          initial={draft.split?.entries ?? []}
          onValidate={(next) => update((d) => ({ ...d, split: next }))}
        />
      ) : null}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen} size="auto" title="Ticket" description={articlesLabel(draft.lines)}>
        <Card padding={0}>
          <ListRow
            primary={<span className="admin-type-body block font-medium text-[var(--admin-danger)]">Vider le ticket</span>}
            onClick={() => void clearTicket()}
          />
        </Card>
      </Sheet>
    </RecentProvider>
  );
}
