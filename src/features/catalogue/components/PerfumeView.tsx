"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ChevronRight, Copy, Pencil } from "lucide-react";
import type { PerfumeSheet } from "@/contracts/catalogue";
import { dzdFromDb, formatDzd } from "@/domain/money";
import { canFeaturePerfume, canPublishPerfume } from "@/domain/publication";
import { stockLabel } from "@/domain/stock";
import { useAction } from "@/app-shell/hooks/useAction";
import { routes } from "@/app-shell/routes";
import { setPerfumeFeaturedAction, setPerfumeStatusAction } from "@/server/catalogue/actions";
import { DateLabel } from "@/ui/patterns/DateLabel";
import { ListSection } from "@/ui/patterns/ListSection";
import { Money } from "@/ui/patterns/Money";
import { Badge } from "@/ui/primitives/Badge";
import { Button } from "@/ui/primitives/Button";
import { Card } from "@/ui/primitives/Card";
import { Divider } from "@/ui/primitives/Divider";
import { ListRow } from "@/ui/primitives/ListRow";
import { StickyAction } from "@/ui/primitives/StickyAction";
import { Switch } from "@/ui/primitives/Switch";
import { PerfumeMediaPanel } from "./PerfumeMediaPanel";
import { StockSheet } from "./StockSheet";

function pulse(element: HTMLElement | null) {
  if (!element) return;
  element.classList.remove("admin-confirm-pulse");
  void element.offsetWidth;
  element.classList.add("admin-confirm-pulse");
  element.addEventListener("animationend", () => element.classList.remove("admin-confirm-pulse"), { once: true });
}

/** « Vendu 12 fois · dernier le 14 sept. » ; `null` si jamais vendu (la ligne est omise). */
export function activityText(units: number): string {
  return units === 1 ? "Vendu 1 fois" : `Vendu ${units} fois`;
}

/**
 * E16 — Fiche parfum EN CONSULTATION (06 §3.5, 02 §4.6) : le vendre, le rendre visible, ajuster son
 * stock, retrouver ses visuels story — sans ouvrir de formulaire. Action principale : « Vendre ».
 */
export function PerfumeView({ sheet }: { sheet: PerfumeSheet }) {
  const router = useRouter();
  const { perfume, pricing, activity, media, featured } = sheet;
  const [stockOpen, setStockOpen] = useState(false);
  const stockRow = useRef<HTMLDivElement>(null);
  const visible = perfume.status === "PUBLISHED";

  const status = useAction(setPerfumeStatusAction);
  const feature = useAction(setPerfumeFeaturedAction);

  const publishVerdict = canPublishPerfume(perfume, perfume.brand);
  const featureVerdict = canFeaturePerfume(perfume, featured.count - (perfume.isFeatured ? 1 : 0));
  const visual = perfume.image.trim();

  return (
    <>
      <div className="flex gap-4">
        <div className="relative aspect-[2/3] w-28 shrink-0 overflow-hidden rounded-[var(--admin-radius-lg)] border border-[var(--admin-border)] bg-[var(--admin-surface)]">
          {visual ? (
            <Image src={visual} alt={`${perfume.brand.name} ${perfume.name}`} fill sizes="112px" className="object-contain p-1" priority />
          ) : (
            <span className="admin-type-caption flex h-full items-center justify-center px-2 text-center text-[var(--admin-text-subtle)]">Aucun visuel</span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
          <div className="min-w-0">
            <h1 className="admin-type-h1 break-words text-[var(--admin-text)]">{perfume.name}</h1>
            <Link
              href={routes.modifierMarque(perfume.brand.id)}
              className="admin-type-body admin-hit-target tap-scale inline-flex max-w-full items-center gap-1 rounded-[var(--admin-radius-md)] text-[var(--admin-accent)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]"
            >
              <span className="truncate">{perfume.brand.name}</span>
              <ChevronRight size={16} aria-hidden className="shrink-0" />
            </Link>
            {perfume.imageLight ? <p className="admin-type-caption text-[var(--admin-text-muted)]">Variante claire enregistrée</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" leadingIcon={<Pencil size={14} />} onClick={() => router.push(routes.modifierParfum(perfume.id))}>
              Modifier
            </Button>
            <Button variant="secondary" size="sm" leadingIcon={<Copy size={14} />} onClick={() => router.push(routes.nouveauParfum({ dupliquer: perfume.id }))}>
              Dupliquer
            </Button>
          </div>
        </div>
      </div>

      <Card padding={3}>
        <Switch
          checked={visible}
          label="Visible sur la vitrine"
          disabled={!visible && !publishVerdict.ok}
          disabledReason={publishVerdict.ok ? undefined : publishVerdict.message}
          description={visible ? "Affiché sur le site." : "Masqué : absent du site."}
          onCheckedChange={async (next) => {
            const result = await status.run({ id: perfume.id, status: next ? "PUBLISHED" : "DRAFT" });
            return result.ok;
          }}
        />
        {visible ? (
          <>
            <Divider className="my-1" />
            <Switch
              checked={perfume.isFeatured}
              label={`Mettre en avant · ${featured.count}/${featured.limit}`}
              disabled={!perfume.isFeatured && !featureVerdict.ok}
              disabledReason={featureVerdict.ok ? undefined : featureVerdict.message}
              description="Un des deux emplacements de l'accueil du site."
              onCheckedChange={async (next) => {
                const result = await feature.run({ id: perfume.id, featured: next });
                return result.ok;
              }}
            />
          </>
        ) : null}
      </Card>

      {pricing.length > 0 ? (
        <ListSection title="Tarifs">
          {pricing.map((row) => (
            <ListRow
              key={row.volumeMl}
              primary={<span className="admin-type-body tnum font-medium text-[var(--admin-text)]">{row.volumeMl} ml</span>}
              secondary={
                row.unitCostDzd === null ? undefined : (
                  <span className="tnum">
                    coût {formatDzd(dzdFromDb(row.unitCostDzd))}
                    {row.unitCostEur ? (
                      <>
                        {" ("}
                        <Money value={row.unitCostEur} tone="inherit" />
                        {")"}
                      </>
                    ) : null}
                  </span>
                )
              }
              trailing={<Money value={row.unitPriceEur} bold className="admin-type-body-em" />}
            />
          ))}
        </ListSection>
      ) : (
        <Card padding={3}>
          <p className="admin-type-body text-[var(--admin-text-muted)]">Aucun tarif mémorisé</p>
        </Card>
      )}

      <div ref={stockRow} className="rounded-[var(--admin-radius-lg)]">
        <Card padding={0}>
          <ListRow
            onClick={() => setStockOpen(true)}
            ariaLabel="Ajuster le stock"
            primary="Stock"
            trailing={
              perfume.stockStatus === "out" ? (
                <Badge tone="danger" size="md">
                  Rupture
                </Badge>
              ) : perfume.stockStatus === "low" ? (
                <Badge tone="warning" size="md">
                  {`Stock bas · ${perfume.stock}`}
                </Badge>
              ) : (
                <span className="admin-type-body tnum text-[var(--admin-text-muted)]">
                  {perfume.stock === null ? stockLabel("untracked") : perfume.stock}
                </span>
              )
            }
            chevron
          />
        </Card>
      </div>

      {activity.units > 0 ? (
        <p className="admin-type-caption tnum px-1 text-[var(--admin-text-muted)]">
          {activityText(activity.units)}
          {activity.lastSoldAt ? (
            <>
              {" · dernier le "}
              <DateLabel date={activity.lastSoldAt} format="short" />
            </>
          ) : null}
        </p>
      ) : null}

      <PerfumeMediaPanel perfumeId={perfume.id} perfumeName={perfume.name} brandName={perfume.brand.name} media={media} />

      <StickyAction>
        <Button variant="primary" size="lg" fullWidth onClick={() => router.push(routes.vendre({ parfum: perfume.id }))}>
          Vendre
        </Button>
      </StickyAction>

      <StockSheet open={stockOpen} onOpenChange={setStockOpen} perfume={perfume} onSaved={() => pulse(stockRow.current)} />
    </>
  );
}
