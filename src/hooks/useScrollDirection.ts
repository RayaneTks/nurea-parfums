"use client";

import { useEffect, useState, useRef } from "react";

export function useScrollDirection() {
  const [scrollDirection, setScrollDirection] = useState<"up" | "down" | null>(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const direction = scrollY > lastScrollY.current ? "down" : "up";

      // Buffer of 10px to avoid flickering
      if (
        direction !== scrollDirection &&
        (scrollY - lastScrollY.current > 10 || scrollY - lastScrollY.current < -10)
      ) {
        setScrollDirection(direction);
      }
      lastScrollY.current = scrollY > 0 ? scrollY : 0;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [scrollDirection]);

  return scrollDirection;
}
