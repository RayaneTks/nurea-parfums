"use client";

import type { ReactNode } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      /*
       * Sans animation au changement de thème. Chaque carte anime sa couleur (160 ms, charte) : au
       * basculement, c'était plus de cent transitions simultanées, que les téléphones rendaient par
       * à-coups pendant plus d'une seconde (vidéos du 28/09/2026). Le survol garde son animation.
       */
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
};

