import type { MargeNetteDTO } from "@/contracts/chiffres";
import { eur, eurFromWire, type MoneyString } from "@/domain/money";
import { KpiTile } from "@/ui/patterns/KpiTile";
import { Money } from "@/ui/patterns/Money";
import { datedLabel, percentLabel } from "@/features/compta/components/compta-model";

type MoneyTilesProps = {
  /** « septembre » : la période que parlent l'Encaissé ET la Marge nette — le même périmètre (02 §6). */
  period: string;
  encaisse: MoneyString;
  margeNette: MargeNetteDTO;
  aEncaisser: MoneyString;
  tresorerie: MoneyString;
  /** Écran d'action de chaque chiffre, fabriqué par la page (`routes.ts`). */
  comptaHref: string;
  collectHref: string;
  treasuryHref: string;
};

const isZero = (value: MoneyString) => eur.isZero(eurFromWire(value));

/**
 * E01 zone 5 — le bloc Argent (amendement A-13 de 07) : « Encaissé · (mois) » DOMINANT, avec la Marge nette
 * du même mois en légende, puis « À encaisser » et « Trésorerie ». Chaque montant est un lien vers l'écran
 * qui le résout (05 §3.2).
 *
 * Il n'y a **qu'un** Encaissé, daté du mois : ni « Encaissé depuis toujours » ni tuile « Ce mois » — deux
 * chiffres voisins qui mesuraient deux périmètres sous deux noms étaient le pire défaut de l'ancien écran
 * (01 §4.6). Le total historique se lit dans la Compta, période « Tout ».
 *
 * Trois tuiles, toujours : le squelette a exactement cette forme, donc rien ne se déplace à l'arrivée des
 * données, y compris un jour sans vente dans le mois (01 §4.6 : l'ancien fallback en rendait 3 pour 2).
 */
export function MoneyTiles({
  period,
  encaisse,
  margeNette,
  aEncaisser,
  tresorerie,
  comptaHref,
  collectHref,
  treasuryHref,
}: MoneyTilesProps) {
  const percent = percentLabel(margeNette.percent);
  const margeLabel = datedLabel("Marge nette", period);

  return (
    <section className="flex flex-col gap-3" aria-label={`Argent · ${period}`} data-money-block>
      <KpiTile
        label={datedLabel("Encaissé", period)}
        amount={encaisse}
        dominant
        href={comptaHref}
        hint={
          <span className="flex items-baseline gap-1">
            <span>{margeLabel}</span>
            <Money value={margeNette.value} compact tone="inherit" />
            {percent ? <span className="tnum">· {percent}</span> : null}
            {margeNette.hasUnknownCost ? <span>· coût à compléter</span> : null}
          </span>
        }
      />
      <div className="grid grid-cols-2 gap-3">
        <KpiTile
          label="À encaisser"
          amount={aEncaisser}
          tone={isZero(aEncaisser) ? "default" : "warning"}
          href={collectHref}
        />
        <KpiTile label="Trésorerie" amount={tresorerie} href={treasuryHref} />
      </div>
    </section>
  );
}
