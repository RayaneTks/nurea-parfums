import type { ElementType, ReactNode, CSSProperties } from "react";
import { space, type SpaceToken } from "@/design/tokens";
import { cn } from "@/lib/utils";

type Align = "start" | "center" | "end" | "stretch" | "baseline";
type Justify = "start" | "center" | "end" | "between" | "around" | "evenly";

type StackProps = {
  direction?: "row" | "column";
  /** Espacement (token) entre enfants. */
  gap?: SpaceToken;
  align?: Align;
  justify?: Justify;
  wrap?: boolean;
  /** Si true, prend tout l'espace dispo (flex: 1). */
  flex?: boolean;
  as?: ElementType;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

const alignClass: Record<Align, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
};

const justifyClass: Record<Justify, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
  evenly: "justify-evenly",
};

export function Stack({
  direction = "column",
  gap = 0,
  align,
  justify,
  wrap = false,
  flex = false,
  as,
  children,
  className,
  style,
}: StackProps) {
  const Tag: ElementType = as ?? "div";
  return (
    <Tag
      className={cn(
        "flex",
        direction === "row" ? "flex-row" : "flex-col",
        wrap ? "flex-wrap" : null,
        flex ? "flex-1 min-w-0" : null,
        align ? alignClass[align] : null,
        justify ? justifyClass[justify] : null,
        className,
      )}
      style={{ gap: space[gap], ...style }}
    >
      {children}
    </Tag>
  );
}

/** Alias commodes. */
export function VStack(props: Omit<StackProps, "direction">) {
  return <Stack direction="column" {...props} />;
}

export function HStack(props: Omit<StackProps, "direction">) {
  return <Stack direction="row" {...props} />;
}
