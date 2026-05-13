"use client";

import { Inbox } from "lucide-react";
import { EmptyState as SharedEmptyState } from "./ui/EmptyState";
import { AdminButton } from "./ui/AdminButton";

interface EmptyStateProps {
  title: string;
  description: string;
  onClearSearch?: () => void;
  hasSearch?: boolean;
}

export function EmptyState({ title, description, onClearSearch, hasSearch }: EmptyStateProps) {
  return (
    <SharedEmptyState
      icon={Inbox}
      title={title}
      description={description}
      action={
        hasSearch && onClearSearch ? (
          <AdminButton variant="ghost" size="sm" onClick={onClearSearch}>
            Effacer la recherche
          </AdminButton>
        ) : null
      }
    />
  );
}
