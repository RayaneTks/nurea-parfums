"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Stack } from "@/ui/primitives/Stack";
import { Card } from "@/ui/primitives/Card";
import { Input } from "@/ui/primitives/Input";
import { Textarea } from "@/ui/primitives/Textarea";
import { Button } from "@/ui/primitives/Button";
import { Heading } from "@/ui/primitives/Heading";
import { StickyAction } from "@/ui/primitives/StickyAction";
import { Toast, type ToastType } from "@/ui/primitives/Toast";
import { PageScaffold } from "@/ui/patterns/PageScaffold";

export function BatchCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [expectedAt, setExpectedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  const submit = () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setToast({ type: "error", message: "Nom requis (min. 2 caractères)." });
      return;
    }
    startTransition(async () => {
      try {
        const r = await fetch("/api/admin/batches", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: trimmed,
            expectedAt: expectedAt || null,
            notes: notes.trim() || null,
          }),
        });
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { error?: string };
          setToast({ type: "error", message: j.error ?? "Création impossible." });
          return;
        }
        const json = (await r.json()) as { batch: { id: string } };
        router.push(`/admin/lots/${json.batch.id}`);
        router.refresh();
      } catch {
        setToast({ type: "error", message: "Réseau indisponible." });
      }
    });
  };

  return (
    <PageScaffold padding={4} formScroll ariaLabel="Nouveau lot">
      <Stack gap={4}>
        <Heading level={1}>Nouveau lot</Heading>

        <Card padding={3}>
          <h2 className="mb-3 text-[14px] font-semibold text-[var(--admin-text)]">
            Informations
          </h2>
          <Stack gap={2}>
            <Input
              label="Nom du lot"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex. Commande de mars"
              autoFocus
              maxLength={120}
            />
            <Input
              label="Date prévue (opt.)"
              type="date"
              value={expectedAt}
              onChange={(e) => setExpectedAt(e.target.value)}
            />
            <Textarea
              label="Notes (opt.)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Fournisseur, transport, etc."
            />
          </Stack>
        </Card>

        <div className="admin-sticky-cta-spacer" aria-hidden />
      </Stack>

      <StickyAction>
        <Button
          type="button"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={pending}
          onClick={submit}
          leadingIcon={<Save size={16} />}
        >
          Créer le lot
        </Button>
      </StickyAction>

      {toast ? (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      ) : null}
    </PageScaffold>
  );
}
