"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { setAccountRole } from "@/lib/accounts/account-actions";
import { needsFreshSession } from "@/lib/accounts/account-safety";
import { ConfirmDialog } from "./confirm-dialog";
import { SignInAgainButton } from "./sign-in-again-button";
import { useAccountAction } from "./use-account-action";

// Student <-> Admin through `admin.setRole`. Needs a fresh Device session (the backend answers
// FRESH_SESSION_REQUIRED, and the dialog then offers to sign in again). Confirmed first, because an
// Admin's powers are broad and a demoted Admin loses this dashboard at once.
export function RoleCard({
  accountId,
  isSelf,
  isAdmin,
}: {
  accountId: string;
  isSelf: boolean;
  isAdmin: boolean;
}) {
  const t = useTranslations("AccountDetail.actions.role");
  const action = useAccountAction();
  const [open, setOpen] = useState(false);
  const target = isAdmin ? "user" : "admin";

  async function confirm() {
    const result = await action.run(
      () => setAccountRole(accountId, target),
      isAdmin ? t("demoted") : t("promoted"),
    );
    if (result.ok) setOpen(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={isAdmin ? "default" : "secondary"}>
            {t("current", { role: isAdmin ? t("admin") : t("student") })}
          </Badge>
          <Button
            type="button"
            variant="outline"
            disabled={isSelf || action.pending}
            onClick={() => {
              action.reset();
              setOpen(true);
            }}
          >
            {isAdmin ? t("makeStudent") : t("makeAdmin")}
          </Button>
        </div>
        {action.done && !open ? (
          <p role="status" className="text-sm text-muted-foreground">
            {action.done}
          </p>
        ) : null}
      </CardContent>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={isAdmin ? t("demoteTitle") : t("promoteTitle")}
        description={isAdmin ? t("demoteDescription") : t("promoteDescription")}
        confirmLabel={t("confirm")}
        pendingLabel={t("pending")}
        pending={action.pending}
        errorKey={action.errorKey}
        destructive={isAdmin}
        errorAction={needsFreshSession(action.errorKey) ? <SignInAgainButton accountId={accountId} /> : null}
        onConfirm={confirm}
      />
    </Card>
  );
}
