"use client";

import type { ElementType, ReactNode, CSSProperties } from "react";
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
  /** Si true, occupe tout l'espace dispo (flex:1). */
  flex?: boolean;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Forward des handlers natifs. */
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
};

export function Box({
  as,
  p, px, py, pt, pb, pl, pr,
  mt, mb,
  flex,
  children,
  className,
  style,
  onClick,
}: BoxProps) {
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
    <Tag
      className={cn(flex ? "flex-1 min-w-0" : null, className)}
      style={inlineStyle}
      onClick={onClick}
    >
      {children}
    </Tag>
  );
}
