"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { eurFromWire, formatEur, spokenEur } from "@/domain/money";
import { cn } from "@/lib/utils";
import { BAR_CHART, BAR_CHART_HEIGHT, barHeights, labelStride, type BarPoint } from "./bar-chart-model";

export type BarChartProps = {
  series: readonly BarPoint[];
  /** « Encaissé par semaine » — titre du tableau lu par VoiceOver. */
  ariaLabel: string;
};

/** Rendu du graphe ; chargé à la demande par `BarChart`. */
export function BarChartCanvas({ series, ariaLabel }: BarChartProps) {
  const [selected, setSelected] = useState(series.length - 1);
  const plotRef = useRef<HTMLDivElement>(null);
  const pressing = useRef(false);
  const heights = barHeights(series);
  const stride = labelStride(series.length);
  const current = series[Math.min(selected, series.length - 1)];

  const selectAt = (clientX: number) => {
    const rect = plotRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const index = Math.floor(((clientX - rect.left) / rect.width) * series.length);
    setSelected(Math.max(0, Math.min(series.length - 1, index)));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (delta === 0) return;
    e.preventDefault();
    setSelected((i) => Math.max(0, Math.min(series.length - 1, i + delta)));
  };

  return (
    <figure className="flex flex-col" style={{ height: BAR_CHART_HEIGHT, gap: BAR_CHART.gapPx }}>
      {/* Valeur de la barre choisie (la dernière par défaut), au tap. */}
      <figcaption
        aria-live="polite"
        className="admin-type-caption tnum truncate text-[var(--admin-text-muted)]"
        style={{ height: BAR_CHART.captionPx }}
      >
        {current ? (
          <>
            {current.label} · <span className="font-semibold text-[var(--admin-text)]">{formatEur(eurFromWire(current.value))}</span>
          </>
        ) : null}
      </figcaption>

      <div
        ref={plotRef}
        role="group"
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={(e: PointerEvent<HTMLDivElement>) => {
          pressing.current = true;
          selectAt(e.clientX);
        }}
        onPointerMove={(e: PointerEvent<HTMLDivElement>) => {
          if (pressing.current || e.pointerType === "mouse") selectAt(e.clientX);
        }}
        onPointerUp={() => {
          pressing.current = false;
        }}
        onPointerLeave={() => {
          pressing.current = false;
        }}
        className={cn(
          "relative touch-pan-y border-b border-[var(--admin-border-strong)]",
          "rounded-[var(--admin-radius-sm)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
        )}
        style={{ height: BAR_CHART.plotPx }}
      >
        <svg
          aria-hidden
          width="100%"
          height="100%"
          viewBox={`0 0 ${series.length * 10} 100`}
          preserveAspectRatio="none"
          className="block"
        >
          {/* Repère retourné : y = 0 en bas, la hauteur d'une barre est son pourcentage. */}
          <g transform="matrix(1 0 0 -1 0 100)">
            {series.map((point, i) => (
              <rect
                key={`${point.label}-${i}`}
                x={i * 10 + 2}
                y={0}
                width={6}
                height={heights[i]}
                className={cn(
                  "fill-[var(--admin-accent)] admin-transition",
                  i === selected ? "opacity-100" : "opacity-40",
                )}
              >
                <title>{`${point.label} · ${formatEur(eurFromWire(point.value))}`}</title>
              </rect>
            ))}
          </g>
        </svg>
      </div>

      <div aria-hidden className="flex" style={{ height: BAR_CHART.labelsPx }}>
        {series.map((point, i) => (
          <span
            key={`${point.label}-${i}`}
            className={cn(
              "admin-type-micro min-w-0 flex-1 truncate text-center",
              i === selected ? "text-[var(--admin-text)]" : "text-[var(--admin-text-subtle)]",
            )}
          >
            {i % stride === 0 || i === series.length - 1 ? point.label : ""}
          </span>
        ))}
      </div>

      {/* Équivalent lu par VoiceOver. */}
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Période</th>
            <th scope="col">Montant</th>
          </tr>
        </thead>
        <tbody>
          {series.map((point, i) => (
            <tr key={`${point.label}-${i}`}>
              <th scope="row">{point.label}</th>
              <td>{spokenEur(eurFromWire(point.value))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
