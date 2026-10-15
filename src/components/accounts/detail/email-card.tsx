"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { FormError } from "@/components/auth/form-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  changeEmail,
  markEmailVerified,
  sendVerificationEmail,
} from "@/lib/accounts/account-actions";
import { isSameEmail } from "@/lib/accounts/profile-form";
import type { AuthErrorKey } from "@/lib/auth/errors";
import { ConfirmDialog } from "./confirm-dialog";
import { useAccountAction } from "./use-account-action";

// Change the email (confirmed first: it becomes unverified and a verification email goes to the new
// address), mark it verified by hand, or resend the verification email.
export function EmailCard({
  accountId,
  email,
  emailVerified,
}: {
  accountId: string;
  email: string;
  emailVerified: boolean;
}) {
  const t = useTranslations("AccountDetail.email");
  const errors = useTranslations("Errors");
  const change = useAccountAction();
  const verify = useAccountAction();
  const resend = useAccountAction();
  const [next, setNext] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fieldError, setFieldError] = useState<AuthErrorKey | "same" | "invalid" | null>(null);
  // The address the last change went to, for the confirmation line.
  const [changedTo, setChangedTo] = useState("");

  // Only one confirmation line at a time: the newest action's.
  function clearMessages() {
    change.reset();
    verify.reset();
    resend.reset();
    setChangedTo("");
  }

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = next.trim();
    if (!z.email().safeParse(trimmed).success) return setFieldError("invalid");
    if (isSameEmail(email, trimmed)) return setFieldError("same");
    setFieldError(null);
    clearMessages();
    setDialogOpen(true);
  }

  async function confirmChange() {
    const target = next.trim();
    const result = await change.run(async () => {
      const outcome = await changeEmail(accountId, target);
      if (!outcome.ok && outcome.field === "email") setFieldError(outcome.errorKey);
      return outcome;
    }, "changed");
    if (result.ok) {
      setChangedTo(target.toLowerCase());
      setNext("");
      setDialogOpen(false);
    } else if (result.field === "email") {
      // The reason belongs on the field, so close the dialog and show it there.
      setDialogOpen(false);
    }
  }

  const fieldMessage =
    fieldError === "invalid"
      ? errors("INVALID_EMAIL")
      : fieldError === "same"
        ? t("sameEmail")
        : fieldError
          ? errors(fieldError)
          : undefined;
  const busy = change.pending || verify.pending || resend.pending;
  const otherError = verify.errorKey ?? resend.errorKey ?? null;
  const changeError = fieldError ? null : change.errorKey;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <span dir="auto" className="text-sm font-medium">
            {email}
          </span>
          <Badge variant={emailVerified ? "secondary" : "outline"}>
            {emailVerified ? t("verified") : t("unverified")}
          </Badge>
        </div>

        {!emailVerified ? (
          <div className="flex flex-col gap-3">
            <FormError errorKey={otherError} />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={async () => {
                  clearMessages();
                  await resend.run(() => sendVerificationEmail(accountId), t("resent"));
                }}
              >
                {resend.pending ? t("resending") : t("resend")}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={async () => {
                  clearMessages();
                  await verify.run(() => markEmailVerified(accountId), t("markedVerified"));
                }}
              >
                {verify.pending ? t("markingVerified") : t("markVerified")}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{t("markVerifiedHelp")}</p>
          </div>
        ) : null}

        <form onSubmit={review} className="flex flex-col gap-4" noValidate>
          <FieldGroup>
            <Field data-invalid={Boolean(fieldMessage) || undefined}>
              <FieldLabel htmlFor="profile-new-email">{t("newEmail")}</FieldLabel>
              <Input
                id="profile-new-email"
                type="email"
                dir="auto"
                autoComplete="off"
                maxLength={254}
                value={next}
                disabled={busy}
                aria-invalid={Boolean(fieldMessage) || undefined}
                onChange={(event) => {
                  setNext(event.target.value);
                  setFieldError(null);
                  change.reset();
                }}
              />
              <FieldError>{fieldMessage}</FieldError>
            </Field>
          </FieldGroup>
          <div>
            <Button type="submit" disabled={busy || next.trim() === ""}>
              {t("change")}
            </Button>
          </div>
        </form>

        {change.done && changedTo ? (
          <p role="status" className="text-sm text-muted-foreground">
            {t("changed", { email: changedTo })}
          </p>
        ) : null}
        {verify.done ? (
          <p role="status" className="text-sm text-muted-foreground">
            {verify.done}
          </p>
        ) : null}
        {resend.done ? (
          <p role="status" className="text-sm text-muted-foreground">
            {resend.done}
          </p>
        ) : null}
      </CardContent>

      <ConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={t("changeTitle")}
        description={t("changeDescription", { email: next.trim() })}
        confirmLabel={t("changeConfirm")}
        pendingLabel={t("changing")}
        pending={change.pending}
        errorKey={changeError}
        onConfirm={confirmChange}
      />
    </Card>
  );
}
