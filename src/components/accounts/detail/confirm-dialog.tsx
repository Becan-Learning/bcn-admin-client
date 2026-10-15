"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { FormError } from "@/components/auth/form-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AuthErrorKey } from "@/lib/auth/errors";

// A yes/no question before an Account action. The caller owns the state and runs the action in
// `onConfirm`; the dialog stays open while it runs and shows the error if it fails. Reusable by the
// other Account sections (ban, removal, Enrollments).
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pendingLabel,
  pending,
  errorKey,
  onConfirm,
  destructive = false,
  confirmDisabled = false,
  children,
  errorAction,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel: string;
  pending: boolean;
  errorKey: AuthErrorKey | null;
  onConfirm: () => void;
  // Red confirm button, for a change that cannot be undone.
  destructive?: boolean;
  // Keeps the confirm button off until the caller's extra input is valid.
  confirmDisabled?: boolean;
  // Extra input between the description and the buttons (a field to fill in, say).
  children?: ReactNode;
  // Shown under the error, for an error with a way forward (like "Sign in again").
  errorAction?: ReactNode;
}) {
  const common = useTranslations("Common");
  return (
    <Dialog open={open} onOpenChange={(next) => (pending ? undefined : onOpenChange(next))}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription dir="auto">{description}</DialogDescription>
        </DialogHeader>
        {children}
        <FormError errorKey={errorKey} />
        {errorKey ? errorAction : null}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            {common("cancel")}
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            disabled={pending || confirmDisabled}
            onClick={onConfirm}
          >
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
