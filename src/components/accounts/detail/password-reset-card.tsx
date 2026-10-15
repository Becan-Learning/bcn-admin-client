"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sendPasswordResetEmail } from "@/lib/accounts/account-actions";
import { ConfirmDialog } from "./confirm-dialog";
import { useAccountAction } from "./use-account-action";

// Sends the Student a reset link. There is deliberately nothing here that sets a password: Admins
// never see or choose one (backend ADR 0002 withholds `user:set-password`).
export function PasswordResetCard({ accountId, email }: { accountId: string; email: string }) {
  const t = useTranslations("AccountDetail.password");
  const action = useAccountAction();
  const [open, setOpen] = useState(false);

  async function confirm() {
    const result = await action.run(() => sendPasswordResetEmail(accountId), t("sent"));
    if (result.ok) setOpen(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex-row flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            action.reset();
            setOpen(true);
          }}
        >
          {t("send")}
        </Button>
        {action.done ? (
          <p role="status" className="text-sm text-muted-foreground">
            {action.done}
          </p>
        ) : null}
      </CardContent>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("dialogTitle")}
        description={t("dialogDescription", { email })}
        confirmLabel={t("confirm")}
        pendingLabel={t("sending")}
        pending={action.pending}
        errorKey={action.errorKey}
        onConfirm={confirm}
      />
    </Card>
  );
}
