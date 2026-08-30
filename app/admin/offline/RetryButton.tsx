"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/ui/primitives/Button";

export function RetryButton() {
  return (
    <Button
      variant="primary"
      size="md"
      leadingIcon={<RefreshCw size={16} />}
      onClick={() => window.location.reload()}
    >
      Réessayer
    </Button>
  );
}
