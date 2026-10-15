"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { CheckIcon, CopyIcon, DownloadIcon, KeyRoundIcon, ShieldCheckIcon } from "lucide-react";
import { FormError } from "@/components/auth/form-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";
import { authErrorKey, type AuthErrorKey } from "@/lib/auth/errors";

// Admins cannot turn two-factor off (it is required for every Admin action), so this card only
// shows its state and regenerates the backup codes. There is deliberately no disable button.
export function TwoFactorCard({ enabled }: { enabled: boolean }) {
  const t = useTranslations("MyAccount.twoFactor");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <ShieldCheckIcon aria-hidden className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">{t("title")}</span>
          {enabled ? <Badge variant="secondary">{t("on")}</Badge> : null}
        </div>
        <p className="text-sm text-muted-foreground">{t("requiredNote")}</p>
        <div className="flex flex-col gap-3 border-t pt-6">
          <div className="grid gap-1">
            <h3 className="text-sm font-medium">{t("backupTitle")}</h3>
            <p className="text-sm text-muted-foreground">{t("backupDescription")}</p>
          </div>
          <div>
            <RegenerateBackupCodes />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RegenerateBackupCodes() {
  const t = useTranslations("MyAccount.twoFactor");
  const common = useTranslations("Common");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [errorKey, setErrorKey] = useState<AuthErrorKey | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      // The codes are shown once: closing the dialog drops them from memory.
      setCodes(null);
      setErrorKey(null);
      setCopied(false);
    }
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    if (!password) return;
    setPending(true);
    setErrorKey(null);
    try {
      const { data, error } = await authClient.twoFactor.generateBackupCodes({ password });
      if (error || !data) {
        setErrorKey(authErrorKey(error));
        return;
      }
      setCodes(data.backupCodes);
    } catch {
      setErrorKey("NETWORK");
    } finally {
      setPending(false);
    }
  }

  async function copyCodes() {
    if (!codes) return;
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
    } catch {
      // Clipboard can be blocked; the codes stay visible to copy by hand.
    }
  }

  function downloadCodes() {
    if (!codes) return;
    const url = URL.createObjectURL(new Blob([`${codes.join("\n")}\n`], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = t("downloadName");
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <KeyRoundIcon data-icon="inline-start" />
          {t("regenerate")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        {codes ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("resultTitle")}</DialogTitle>
              <DialogDescription>{t("resultDescription")}</DialogDescription>
            </DialogHeader>
            <ul
              dir="ltr"
              className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/50 p-3 font-mono text-sm"
            >
              {codes.map((code) => (
                <li key={code}>{code}</li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={copyCodes}>
                {copied ? <CheckIcon data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />}
                {copied ? common("copied") : t("copyCodes")}
              </Button>
              <Button variant="outline" onClick={downloadCodes}>
                <DownloadIcon data-icon="inline-start" />
                {t("downloadCodes")}
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>{t("done")}</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={generate} className="flex flex-col gap-6">
            <DialogHeader>
              <DialogTitle>{t("dialogTitle")}</DialogTitle>
              <DialogDescription>{t("dialogDescription")}</DialogDescription>
            </DialogHeader>
            <FormError errorKey={errorKey} />
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="backup-password">{common("password")}</FieldLabel>
                <Input
                  id="backup-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  autoFocus
                  disabled={pending}
                />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {common("cancel")}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? t("generating") : t("generate")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
