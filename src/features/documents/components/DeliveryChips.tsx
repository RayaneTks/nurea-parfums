"use client";

import { useState } from "react";
import { parisDayKey, parseParisDayKey } from "@/domain/periods";
import { FormField } from "@/ui/patterns/FormField";
import { formatDate } from "@/ui/patterns/date-format";
import { Chip } from "@/ui/primitives/Chip";
import { Input } from "@/ui/primitives/Input";
import { Text } from "@/ui/primitives/Text";

/** « 2026-09-17 » + 2 jours → « 2026-09-19 » (calendrier, jamais des millisecondes). */
export function shiftDayKey(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number) as [number, number, number];
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

type DeliveryChipsProps = {
  /** Jour de Paris « AAAA-MM-JJ », ou null (sans date). */
  value: string | null;
  onChange: (day: string | null) => void;
  /** Heure facultative « HH:MM » (06 E11 zone 6) ; absente : jour seul. */
  time?: { value: string; onChange: (time: string) => void };
  /** Chip « Sans date » quand une date est posée (S01). */
  clearable?: boolean;
};

/**
 * « Livraison prévue » (06 E11 zone 6, S01 zone 6) : chips « Aujourd'hui · Demain · Après-demain · Choisir… »
 * (sélecteur natif de date, heure facultative). Un jour sans heure est enregistré à 00:00 Europe/Paris (03 §3).
 */
export function DeliveryChips({ value, onChange, time, clearable = false }: DeliveryChipsProps) {
  const [choosing, setChoosing] = useState(false);
  const today = parisDayKey();
  const plus = (days: number) => shiftDayKey(today, days);
  const quick = [today, plus(1), plus(2)];
  const other = value !== null && !quick.includes(value);
  const otherLabel = other ? formatDate(parseParisDayKey(value) ?? new Date(), "day") : "Choisir…";

  return (
    <div className="flex flex-col gap-2" role="group" aria-label="Livraison prévue">
      <Text variant="caption" tone="muted" className="font-semibold">
        Livraison prévue
      </Text>
      <div className="flex flex-wrap gap-2">
        <Chip active={value === today} onClick={() => (setChoosing(false), onChange(today))}>
          Aujourd&apos;hui
        </Chip>
        <Chip active={value === plus(1)} onClick={() => (setChoosing(false), onChange(plus(1)))}>
          Demain
        </Chip>
        <Chip active={value === plus(2)} onClick={() => (setChoosing(false), onChange(plus(2)))}>
          Après-demain
        </Chip>
        <Chip active={choosing || other} onClick={() => setChoosing(true)}>
          {otherLabel}
        </Chip>
        {clearable && value !== null ? <Chip onClick={() => (setChoosing(false), onChange(null))}>Sans date</Chip> : null}
      </div>
      {choosing ? (
        <FormField label="Date de livraison">
          {(field) => (
            <Input
              {...field}
              type="date"
              min={today}
              defaultValue={value ?? today}
              onChange={(e) => {
                if (!e.target.value) return;
                if (!time) setChoosing(false);
                onChange(e.target.value);
              }}
            />
          )}
        </FormField>
      ) : null}
      {time && value !== null && (choosing || time.value !== "") ? (
        <FormField label="Heure de livraison" hint="Facultative">
          {(field) => <Input {...field} type="time" value={time.value} onChange={(e) => time.onChange(e.target.value)} />}
        </FormField>
      ) : null}
    </div>
  );
}
