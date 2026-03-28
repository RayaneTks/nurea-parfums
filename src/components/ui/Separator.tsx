"use client";

import Image from "next/image";
import { ScrollReveal } from "./ScrollReveal";

interface SeparatorProps {
  variant?: "bordeaux" | "copper" | "ivory";
  withMonogram?: boolean;
  className?: string;
}

export const Separator = ({
  variant = "copper",
  withMonogram = false,
  className = "",
}: SeparatorProps) => {
  const src = `/branding/separators/nurea_separator_${variant}.svg`;

  return (
    <ScrollReveal direction="scale" className={`py-12 md:py-16 ${className}`}>
      <div className="flex flex-col items-center gap-5">
        {withMonogram && (
          <Image
            src="/branding/monogram/np-free-cuivre.png"
            alt=""
            width={36}
            height={36}
            className="opacity-20"
            sizes="36px"
            style={{ height: "auto" }}
          />
        )}
        <Image
          src={src}
          alt=""
          width={140}
          height={14}
          className="h-auto w-auto max-w-[100px] opacity-30 md:max-w-[140px]"
          sizes="(max-width: 768px) 100px, 140px"
          style={{ width: "auto", height: "auto" }}
        />      </div>
    </ScrollReveal>
  );
};
