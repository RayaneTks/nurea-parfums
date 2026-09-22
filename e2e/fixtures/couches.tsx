/**
 * Banc des couches (05 §2.7, §3.1, §3.2) : les VRAIES briques du shell et du design system —
 * `FeedbackProvider`, `UndoProvider`, `Sheet`, `ConfirmDialog` — montées dans une page de la gestion.
 *
 * Aucun écran livré n'ouvre encore de sheet (J4 : racines d'onglet provisoires), et les défauts
 * visés ne se voient qu'avec un vrai moteur de rendu : empilement par z-index, `pointer-events: none`
 * posé sur `<body>` par la couche modale, test de toucher. D'où ce banc, compilé par esbuild
 * (`e2e/helpers/banc.ts`) et injecté dans `/admin` : la feuille admin réelle s'y applique, aucune
 * route de test n'existe dans l'app. Remplacé par les parcours réels quand S01 arrive (J8).
 */
import { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { FeedbackProvider, useConfirm } from "@/app-shell/FeedbackProvider";
import { UndoProvider, useUndo } from "@/app-shell/UndoProvider";
import { Button } from "@/ui/primitives/Button";
import { Sheet } from "@/ui/primitives/Sheet";
import { BANC_GLOBAL, ECHEC_CONFIRMATION, ECRITURE_MS, TOAST_MESSAGE, type Scene } from "./couches-contrat";

/** Une sheet ouverte, et depuis elle une suppression différée : le filet « Annuler » doit répondre. */
function ToastSousSheet() {
  const { scheduleDelete } = useUndo();
  const [open, setOpen] = useState(true);
  const [ligne, setLigne] = useState("présente");

  return (
    <Sheet open={open} onOpenChange={setOpen} title="Commande de Fares">
      <p data-banc-etat>{`Ligne ${ligne}`}</p>
      <Button
        variant="danger"
        onClick={() => {
          setLigne("masquée");
          scheduleDelete({
            message: TOAST_MESSAGE,
            onCommit: () => setLigne("supprimée"),
            onUndo: () => setLigne("restaurée"),
          });
        }}
      >
        Supprimer la ligne
      </Button>
    </Sheet>
  );
}

/**
 * Sheet, puis sheet imbriquée, puis confirmation dont la première écriture échoue : la confirmation
 * passe au-dessus de la sheet imbriquée et affiche l'échec en son sein.
 */
function ConfirmationEnEchec() {
  const confirm = useConfirm();
  const [detail, setDetail] = useState(false);
  const [issue, setIssue] = useState("en attente");
  const tentatives = useRef(0);

  const supprimer = async () => {
    const ok = await confirm(
      {
        title: "Supprimer ce paiement ?",
        description: "Le reste à encaisser remonte de 40,00 €.",
        confirmLabel: "Supprimer",
        tone: "danger",
      },
      async () => {
        tentatives.current += 1;
        await new Promise((resolve) => setTimeout(resolve, ECRITURE_MS));
        if (tentatives.current === 1) throw new Error(ECHEC_CONFIRMATION);
      },
    );
    setIssue(ok ? `confirmé après ${tentatives.current} tentatives` : `annulé après ${tentatives.current} tentative(s)`);
  };

  return (
    <Sheet open onOpenChange={() => undefined} title="Commande de Fares">
      <p data-banc-issue>{issue}</p>
      <Button variant="secondary" onClick={() => setDetail(true)}>
        Voir le paiement
      </Button>
      <Sheet nested open={detail} onOpenChange={setDetail} title="Paiement du 12 septembre">
        <Button variant="danger" onClick={() => void supprimer()}>
          Supprimer le paiement
        </Button>
      </Sheet>
    </Sheet>
  );
}

const SCENES: Record<Scene, () => React.JSX.Element> = {
  "toast-sous-sheet": ToastSousSheet,
  "confirmation-en-echec": ConfirmationEnEchec,
};

function mount(scene: Scene): void {
  const host = document.createElement("div");
  host.setAttribute("data-banc-couches", scene);
  document.body.appendChild(host);
  const Scene = SCENES[scene];
  createRoot(host).render(
    <FeedbackProvider>
      <UndoProvider>
        <Scene />
      </UndoProvider>
    </FeedbackProvider>,
  );
}

(window as unknown as Record<string, unknown>)[BANC_GLOBAL] = { mount };
