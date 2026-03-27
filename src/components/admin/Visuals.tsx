"use client";

import Image from "next/image";
import { useState } from "react";
import { SunMoon } from "lucide-react";

export function StatusDot({ status }: { status: string }) {
  const isPublished = status === "PUBLISHED";
  return (
    <div className="relative flex h-2 w-2 items-center justify-center">
      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-20 ${isPublished ? "bg-emerald-400" : "bg-amber-400"}`} />
      <span className={`relative inline-block h-2 w-2 rounded-full ${isPublished ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"}`} />
    </div>
  );
}

export function BrandVisual({ name, image, size = 52 }: { name: string; image: string | null; size?: number }) {
  if (image?.trim()) {
    return (
      <div 
        className="relative shrink-0 rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-inner group-active:scale-95 transition-transform"
        style={{ width: size, height: size }}
      >
        <Image src={image} alt={name} fill className="object-cover" />
      </div>
    );
  }
  return (
    <div 
      className="flex shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-[13px] font-black uppercase tracking-wider text-zinc-500 border border-zinc-800 shadow-inner group-active:scale-95 transition-transform"
      style={{ width: size, height: size }}
    >
      {name.slice(0, 2)}
    </div>
  );
}

export function PerfumeVisual({ name, image, imageLight, size = "md", onClick }: { name: string; image: string; imageLight?: string | null; size?: "md" | "lg"; onClick?: () => void }) {
  const isLarge = size === "lg";
  
  return (
    <div 
      className={`relative shrink-0 rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-2xl transition-all duration-300 select-none touch-manipulation
        ${onClick ? "cursor-pointer active:scale-95 active:border-blue-500/50" : ""}
        ${isLarge ? "h-[320px] w-full max-w-[240px] mx-auto" : "h-[80px] w-[60px]"}
      `}
      onClick={onClick}
    >
      <Image 
        src={image} 
        alt={name} 
        fill 
        className="object-cover" 
        sizes={isLarge ? "240px" : "60px"}
        priority={isLarge}
      />
      {imageLight && (
        <div className="absolute bottom-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white/90">
          <SunMoon className="h-3 w-3" />
        </div>
      )}
    </div>
  );
}
