"use client";

import Image from "next/image";

const VISUAL_SIZE = 52;

export function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full h-2 w-2 ${
        status === "PUBLISHED" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]"
      }`}
    />
  );
}

export function BrandVisual({ name, image, size = 52 }: { name: string; image: string | null; size?: number }) {
  if (image?.trim()) {
    return (
      <div 
        className="relative shrink-0 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800"
        style={{ width: size, height: size }}
      >
        <Image src={image} alt={name} width={size} height={size} className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div 
      className="flex shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-[11px] font-bold uppercase tracking-wider text-zinc-500 border border-zinc-700/50"
      style={{ width: size, height: size }}
    >
      {name.slice(0, 2)}
    </div>
  );
}

export function PerfumeVisual({ name, image, imageLight }: { name: string; image: string; imageLight: string | null }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5 p-1 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
      <div className="relative h-[48px] w-[36px] rounded-lg overflow-hidden shadow-sm">
        <Image src={image} alt={name} fill className="object-cover" sizes="36px" />
      </div>
      {imageLight?.trim() ? (
        <div className="relative h-[48px] w-[36px] rounded-lg overflow-hidden shadow-sm">
          <Image src={imageLight} alt={`${name} (clair)`} fill className="object-cover" sizes="36px" />
        </div>
      ) : null}
    </div>
  );
}
