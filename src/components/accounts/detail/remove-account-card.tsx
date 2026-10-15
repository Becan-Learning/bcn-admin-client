"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { removeAccount } from "@/lib/accounts/account-actions";
import { emailConfirmationMatches, needsFreshSession } from "@/lib/accounts/account-safety";
import type { AuthErrorKey } from "@/lib/auth/errors";
import { ConfirmDialog } from "./confirm-dialog";
import { SignInAgainButton } from "./sign-in-again-button";

// Permanently removes the Account (`admin.removeUser`) after the Admin types its email. Needs a fresh
// Device session. It does not use `useAccountAction`: refreshing the page of an Account that no longer
// exists would only show a not-found flash, so on success it goes straight to the list.
export function RemoveAccountCard({
  accountId,
  email,
  isSelf,
}: {
  accountId: string;
  email: string;
  isSelf: boolean;
}) {
  const t = useTranslations("AccountDetail.actions");
  const router = useRouter();
  const [navigating, startNavigation] = useTransition();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [running, setRunning] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [errorKey, setErrorKey] = useState<AuthErrorKey | null>(null);
  const pending = running || navigating;

  async function confirm() {
    if (!emailConfirmationMatches(typed, email)) return;
    setRunning(true);
    setErrorKey(null);
    try {
      const result = await removeAccount(accountId);
      if (!result.ok) {
        setErrorKey(result.errorKey);
        return;
      }
      setRemoved(true);
      startNavigation(() => router.replace("/accounts"));
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle>{t("remove.title")}</CardTitle>
        <CardDescription>{t("remove.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          type="button"
          variant="destructive"
          disabled={isSelf || pending}
          onClick={() => {
            setTyped("");
            setErrorKey(null);
            setOpen(true);
          }}
        >
          {t("remove.action")}
        </Button>
      </CardContent>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("remove.dialogTitle")}
        description={t("remove.dialogDescription")}
        confirmLabel={t("remove.confirm")}
        pendingLabel={t("remove.pending")}
        pending={pending}
        errorKey={errorKey}
        destructive
        confirmDisabled={!emailConfirmationMatches(typed, email)}
        errorAction={needsFreshSession(errorKey) ? <SignInAgainButton accountId={accountId} /> : null}
        onConfirm={confirm}
      >
        <Field>
          <FieldLabel htmlFor="remove-confirm-email">
            {t.rich("remove.typeEmail", {
              email,
              strong: (chunks) => (
                <strong dir="auto" className="font-semibold break-all">
                  {chunks}
                </strong>
              ),
            })}
          </FieldLabel>
          <Input
            id="remove-confirm-email"
            dir="auto"
            autoComplete="off"
            spellCheck={false}
            value={typed}
            disabled={pending}
            onChange={(event) => setTyped(event.target.value)}
          />
          {removed ? (
            <FieldDescription role="status">{t("removed")}</FieldDescription>
          ) : null}
        </Field>
      </ConfirmDialog>
    </Card>
  );
}
