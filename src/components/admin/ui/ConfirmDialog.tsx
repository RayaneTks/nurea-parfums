"use client";

import { AlertTriangle } from "lucide-react";
import { AdminButton } from "./AdminButton";
import { Modal } from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Annuler",
  destructive = false,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      dismissible={!isLoading}
      footer={
        <div className="flex flex-col gap-2">
          <AdminButton
            variant={destructive ? "danger" : "primary"}
            size="lg"
            isLoading={isLoading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </AdminButton>
          <AdminButton variant="ghost" size="lg" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </AdminButton>
        </div>
      }
    >
      <div className="flex items-start gap-3">
        {destructive ? (
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--admin-danger-subtle)] border border-[var(--admin-danger-border)] shrink-0">
            <AlertTriangle className="h-5 w-5 text-admin-danger" aria-hidden />
          </div>
        ) : null}
        <div className="flex-1">
          {description ? (
            <p className="text-[13px] leading-snug text-admin-muted">{description}</p>
          ) : null}
          {destructive ? (
            <p className="mt-2 text-[12px] italic text-admin-subtle">
              Cette action est irréversible.
            </p>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
