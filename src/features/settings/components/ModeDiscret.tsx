"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { DISCRET_COOKIE, DISCRET_DESCRIPTION, estDiscret } from "@/contracts/discretion";
import { Switch } from "@/ui/primitives/Switch";

/**
 * L'interrupteur du mode discret (`src/contracts/discretion.ts`).
 *
 * Le réglage vit dans un cookie de CET appareil : aucune action serveur, aucune écriture en base.
 * C'est volontaire — brouiller son écran n'est pas une donnée d'entreprise, et deux téléphones
 * doivent pouvoir être dans deux états différents.
 *
 * `router.refresh()` après l'écriture : la moitié des montants sont rendus par le serveur, et c'est
 * le layout qui lit le cookie. Sans ce rafraîchissement, la bascule ne prendrait qu'à la navigation
 * suivante — on la veut immédiate, puisqu'on la fait juste avant de tendre son téléphone.
 *
 * `Max-Age` d'un an et `SameSite=Lax` : le témoin survit à la fermeture de l'app installée, et ne
 * voyage pas vers un autre site. Pas de `Secure` en clair ici — le cookie ne porte aucun secret, il
 * porte un « 1 ».
 */
export function ModeDiscret() {
  const router = useRouter();
  const [actif, setActif] = useState(false);
  const [, startTransition] = useTransition();

  // L'état initial est lu du cookie APRÈS le montage : le serveur a déjà rendu l'écran brouillé ou
  // non, cet état-ci ne sert qu'à dessiner l'interrupteur dans la bonne position.
  useEffect(() => {
    const valeur = document.cookie
      .split("; ")
      .find((part) => part.startsWith(`${DISCRET_COOKIE}=`))
      ?.split("=")[1];
    setActif(estDiscret(valeur));
  }, []);

  const basculer = (prochain: boolean) => {
    setActif(prochain);
    const anUnAn = 60 * 60 * 24 * 365;
    document.cookie = prochain
      ? `${DISCRET_COOKIE}=1; Path=/; Max-Age=${anUnAn}; SameSite=Lax`
      : `${DISCRET_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    startTransition(() => router.refresh());
  };

  return <Switch label="Mode discret" description={DISCRET_DESCRIPTION} checked={actif} onCheckedChange={basculer} />;
}
