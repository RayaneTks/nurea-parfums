"use client";

import { Button } from "@/ui/primitives/Button";
import { Card } from "@/ui/primitives/Card";
import { Skeleton, SkeletonRow } from "@/ui/primitives/Skeleton";
import { Text } from "@/ui/primitives/Text";
import { useCloseDocumentSheet, useSheetChrome } from "./DocumentSheetFrame";

/**
 * États de la fiche document hors contenu (06 S01 « États ») : squelette aux proportions de la fiche — la sheet
 * s'ouvre tout de suite, l'en-tête et les blocs arrivent ensuite —, et document introuvable.
 */

export function DocumentSheetSkeleton() {
  useSheetChrome({
    title: (
      <span className="flex h-[25px] items-center" aria-label="Chargement du document">
        <Skeleton width={160} height={18} />
      </span>
    ),
    description: (
      <span className="flex h-[18px] items-center">
        <Skeleton width={200} height={12} />
      </span>
    ),
  });
  return (
    <div className="flex flex-col gap-5" aria-busy aria-label="Chargement du document">
      <Skeleton height={44} className="rounded-[var(--admin-radius-md)]" />
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((index) => (
          <div key={index} className="flex flex-col gap-1 px-1 py-1">
            <Skeleton width="60%" height={11} />
            <Skeleton width="80%" height={20} />
          </div>
        ))}
      </div>
      <Card padding={0}>
        <SkeletonRow />
        <div className="border-t border-[var(--admin-border)]">
          <SkeletonRow />
        </div>
      </Card>
      <Card padding={0}>
        <SkeletonRow avatar={false} />
      </Card>
    </div>
  );
}

export function DocumentMissing() {
  const close = useCloseDocumentSheet();
  useSheetChrome({ title: "Document introuvable" });
  return (
    <div className="flex flex-col items-center gap-4 px-2 py-8 text-center">
      <Text variant="h3">Ce document n&apos;existe plus</Text>
      <Text variant="body" tone="muted">
        Il a peut-être été supprimé depuis un autre écran.
      </Text>
      <Button variant="secondary" onClick={close}>
        Fermer
      </Button>
    </div>
  );
}
