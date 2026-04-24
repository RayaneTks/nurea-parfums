import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface AdminShellProps {
  children: ReactNode;
  className?: string;
}

export function AdminShell({ children, className }: AdminShellProps) {
  return (
    <div className={cn("admin-mobile-shell flex flex-col", className)}>
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}
