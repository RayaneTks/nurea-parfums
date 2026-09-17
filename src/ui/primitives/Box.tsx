import type { CSSProperties, ElementType, ReactNode } from "react";
import { space, type SpaceToken } from "@/design/tokens";
import { cn } from "@/lib/utils";

type BoxProps = {
  as?: ElementType;
  p?: SpaceToken;
  px?: SpaceToken;
  py?: SpaceToken;
  pt?: SpaceToken;
  pb?: SpaceToken;
  pl?: SpaceToken;
  pr?: SpaceToken;
  mt?: SpaceToken;
  mb?: SpaceToken;
  /** Occupe l'espace disponible (flex: 1). */
  flex?: boolean;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

/**
 * Boîte d'espacement sur la grille 4 px. Pas de `onClick` : un élément
 * tapable est un `Button`, une `ListRow` ou une `Card interactive`, qui portent
 * rôle, clavier, press scale et cible de 44 px.
 */
export function Box({ as, p, px, py, pt, pb, pl, pr, mt, mb, flex, children, className, style }: BoxProps) {
  const Tag: ElementType = as ?? "div";
  const inlineStyle: CSSProperties = {
    ...(p !== undefined ? { padding: space[p] } : {}),
    ...(px !== undefined ? { paddingLeft: space[px], paddingRight: space[px] } : {}),
    ...(py !== undefined ? { paddingTop: space[py], paddingBottom: space[py] } : {}),
    ...(pt !== undefined ? { paddingTop: space[pt] } : {}),
    ...(pb !== undefined ? { paddingBottom: space[pb] } : {}),
    ...(pl !== undefined ? { paddingLeft: space[pl] } : {}),
    ...(pr !== undefined ? { paddingRight: space[pr] } : {}),
    ...(mt !== undefined ? { marginTop: space[mt] } : {}),
    ...(mb !== undefined ? { marginBottom: space[mb] } : {}),
    ...style,
  };
  return (
    <Tag className={cn(flex ? "min-w-0 flex-1" : null, className)} style={inlineStyle}>
      {children}
    </Tag>
  );
}
