"use client";

import type { ReactNode } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right" | "scale";
}

export const ScrollReveal = ({
  children,
  className = "",
  delay = 0,
  direction = "up",
}: ScrollRevealProps) => {
  const ref = useScrollReveal<HTMLDivElement>();

  const directionClass = {
    up: "scroll-reveal",
    left: "scroll-reveal-left",
    right: "scroll-reveal-right",
    scale: "scroll-reveal-scale",
  }[direction];

  return (
    <div
      ref={ref}
      className={`${directionClass} ${className}`}
      style={delay > 0 ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
};
