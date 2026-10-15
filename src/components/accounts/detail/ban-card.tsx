"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { banAccount, unbanAccount } from "@/lib/accounts/account-actions";
import {
  banExpiresIn,
  banExpiryState,
  banReasonText,
  BAN_EXPIRY_CHOICES,
  MAX_CUSTOM_BAN_DAYS,
  type BanExpiryChoice,
} from "@/lib/accounts/account-safety";
import { FormError } from "@/components/auth/form-error";
import { ConfirmDialog } from "./confirm-dialog";
import { timeValues } from "./date-time";
import { useAccountAction } from "./use-account-action";

// Ban with an optional reason and expiry, or lift a ban. Banning ends the Account's Device sessions
// (done by the backend). The reason is user content, so it is `dir="auto"`.
export function BanCard({
  accountId,
  isSelf,
  banned,
  banReason,
  banExpires,
}: {
  accountId: string;
  isSelf: boolean;
  banned: boolean;
  banReason: string | null;
  banExpires: string | null;
}) {
  const t = useTranslations("AccountDetail.actions.ban");
  const ban = useAccountAction();
  const lift = useAccountAction();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [choice, setChoice] = useState<BanExpiryChoice>("never");
  const [customDays, setCustomDays] = useState("");

  const expiry = banExpiresIn(choice, customDays);
  const customInvalid = choice === "custom" && !expiry.ok;
  const reasonText = banReasonText(banReason);
  const state = banExpiryState(banExpires, new Date());

  function openDialog() {
    lift.reset();
    ban.reset();
    setReason("");
    setChoice("never");
    setCustomDays("");
    setOpen(true);
  }

  async function confirmBan() {
    if (!expiry.ok) return;
    const result = await ban.run(() => banAccount(accountId, reason, expiry.seconds), t("done"));
    if (result.ok) setOpen(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {banned ? (
          <div className="flex flex-col gap-2 text-sm">
            <div>
              <Badge variant="destructive">{t("bannedNotice")}</Badge>
            </div>
            <p>
              <span className="font-medium">{t("reasonLabel")}: </span>
              {reasonText ? <span dir="auto">{reasonText}</span> : <span className="text-muted-foreground">{t("noReason")}</span>}
            </p>
            <p className="text-muted-foreground">
              {state.kind === "never" ? (
                t("never")
              ) : state.kind === "active" ? (
                t.rich("expiresAt", timeValues(state.at))
              ) : (
                t.rich("expiredAt", timeValues(state.at))
              )}
            </p>
            <FormError errorKey={lift.errorKey} />
            <div>
              <Button
                type="button"
                variant="outline"
                disabled={lift.pending}
                onClick={async () => {
                  ban.reset();
                  await lift.run(() => unbanAccount(accountId), t("liftDone"));
                }}
              >
                {lift.pending ? t("liftPending") : t("lift")}
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <Button type="button" variant="destructive" disabled={isSelf || ban.pending} onClick={openDialog}>
              {t("action")}
            </Button>
          </div>
        )}
        {ban.done ? (
          <p role="status" className="text-sm text-muted-foreground">
            {ban.done}
          </p>
        ) : null}
        {lift.done ? (
          <p role="status" className="text-sm text-muted-foreground">
            {lift.done}
          </p>
        ) : null}
      </CardContent>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("dialogTitle")}
        description={t("dialogDescription")}
        confirmLabel={t("confirm")}
        pendingLabel={t("pending")}
        pending={ban.pending}
        errorKey={ban.errorKey}
        destructive
        confirmDisabled={customInvalid}
        onConfirm={confirmBan}
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="ban-reason">{t("reasonField")}</FieldLabel>
            <Input
              id="ban-reason"
              dir="auto"
              autoComplete="off"
              maxLength={500}
              value={reason}
              disabled={ban.pending}
              onChange={(event) => setReason(event.target.value)}
            />
            <FieldDescription>{t("reasonHelp")}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="ban-expiry">{t("expiryField")}</FieldLabel>
            <Select
              value={choice}
              disabled={ban.pending}
              onValueChange={(value) => setChoice(value as BanExpiryChoice)}
            >
              <SelectTrigger id="ban-expiry" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BAN_EXPIRY_CHOICES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(EXPIRY_LABELS[value])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {choice === "custom" ? (
            <Field data-invalid={(customInvalid && customDays !== "") || undefined}>
              <FieldLabel htmlFor="ban-custom-days">{t("customDays")}</FieldLabel>
              <Input
                id="ban-custom-days"
                inputMode="numeric"
                autoComplete="off"
                maxLength={String(MAX_CUSTOM_BAN_DAYS).length}
                value={customDays}
                disabled={ban.pending}
                aria-invalid={(customInvalid && customDays !== "") || undefined}
                onChange={(event) => setCustomDays(event.target.value)}
              />
              <FieldError>{customInvalid && customDays !== "" ? t("customDaysInvalid") : undefined}</FieldError>
            </Field>
          ) : null}
        </FieldGroup>
      </ConfirmDialog>
    </Card>
  );
}

const EXPIRY_LABELS = {
  never: "expiryNever",
  "1": "expiry1",
  "7": "expiry7",
  "30": "expiry30",
  custom: "expiryCustom",
} as const;
