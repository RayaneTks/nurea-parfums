import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface AdminShellProps {
  children: ReactNode;
  className?: string;
}

export function AdminShell({ children, className }: AdminShellProps) {
  return (
    <div className={cn("admin-mobile-shell flex min-h-0 flex-1 flex-col", className)}>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
