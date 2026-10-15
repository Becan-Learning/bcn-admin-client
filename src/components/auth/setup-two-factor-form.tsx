"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";
import { authErrorKey, type AuthErrorKey } from "@/lib/auth/errors";
import { AuthCard } from "./auth-card";
import { FormError } from "./form-error";
import { TOTP_LENGTH, TotpField } from "./totp-field";

type Enrollment = { totpURI: string; backupCodes: string[] };
type Step = "password" | "scan" | "backup";

function secretFromUri(uri: string): string {
  try {
    return new URL(uri).searchParams.get("secret") ?? "";
  } catch {
    return "";
  }
}

// Forced two-factor setup: password, then scan and verify a code, then the backup codes, shown once.
// Backup codes live in component state only. Two-factor is on once the code is verified.
export function SetupTwoFactorForm() {
  const t = useTranslations("Setup");
  const common = useTranslations("Common");
  const router = useRouter();
  const [step, setStep] = useState<Step>("password");
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [errorKey, setErrorKey] = useState<AuthErrorKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  async function guarded(action: () => Promise<void>) {
    setPending(true);
    setErrorKey(null);
    try {
      await action();
    } catch {
      setErrorKey("NETWORK");
    } finally {
      setPending(false);
    }
  }

  function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    void guarded(async () => {
      const { data, error } = await authClient.twoFactor.enable({ password });
      if (error || data?.method !== "totp") {
        setErrorKey(authErrorKey(error));
        return;
      }
      setEnrollment({ totpURI: data.totpURI, backupCodes: data.backupCodes });
      setStep("scan");
    });
  }

  function verify(value: string) {
    if (pending || value.length !== TOTP_LENGTH) return;
    void guarded(async () => {
      const { error } = await authClient.twoFactor.verifyTotp({ code: value });
      if (error) {
        setErrorKey(authErrorKey(error));
        setCode("");
        return;
      }
      setStep("backup");
    });
  }

  async function copyCodes() {
    if (!enrollment) return;
    try {
      await navigator.clipboard.writeText(enrollment.backupCodes.join("\n"));
      setCopied(true);
    } catch {
      // Clipboard can be blocked; the codes stay visible to copy by hand.
    }
  }

  function finish() {
    router.replace("/");
    router.refresh();
  }

  if (step === "password") {
    return (
      <AuthCard title={t("title")} description={`${t("intro")} ${t("passwordStepDescription")}`}>
        <form onSubmit={start} className="flex flex-col gap-6">
          <FormError errorKey={errorKey} />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="password">{common("password")}</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                autoFocus
                disabled={pending}
              />
            </Field>
          </FieldGroup>
          <Button type="submit" disabled={pending}>
            {pending ? t("starting") : t("start")}
          </Button>
        </form>
      </AuthCard>
    );
  }

  if (step === "scan" && enrollment) {
    const secret = secretFromUri(enrollment.totpURI);
    return (
      <AuthCard title={t("title")} description={t("scanStepDescription")}>
        <div className="flex flex-col gap-6">
          <FormError errorKey={errorKey} />
          <div className="mx-auto w-fit rounded-lg bg-white p-3" role="img" aria-label={t("qrAlt")}>
            <QRCodeSVG value={enrollment.totpURI} size={176} marginSize={0} />
          </div>
          {secret ? (
            <Field>
              <FieldLabel htmlFor="secret">{t("secretLabel")}</FieldLabel>
              <Input id="secret" dir="ltr" readOnly value={secret} className="font-mono text-xs" />
              <FieldDescription>{t("secretHelp")}</FieldDescription>
            </Field>
          ) : null}
          <Field>
            <FieldLabel htmlFor="code">{t("codeLabel")}</FieldLabel>
            <TotpField
              id="code"
              value={code}
              onChange={setCode}
              onComplete={verify}
              disabled={pending}
              autoFocus
            />
          </Field>
          <Button onClick={() => verify(code)} disabled={pending || code.length !== TOTP_LENGTH}>
            {pending ? t("verifying") : t("verify")}
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t("backupTitle")} description={t("backupDescription")}>
      <ul
        dir="ltr"
        className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/50 p-3 font-mono text-sm"
      >
        {enrollment?.backupCodes.map((backupCode) => <li key={backupCode}>{backupCode}</li>)}
      </ul>
      <Button variant="outline" onClick={copyCodes}>
        {copied ? <CheckIcon data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />}
        {copied ? t("copied") : t("copyCodes")}
      </Button>
      <Field orientation="horizontal">
        <Checkbox
          id="saved"
          checked={saved}
          onCheckedChange={(checked) => setSaved(checked === true)}
        />
        <FieldLabel htmlFor="saved">{t("savedConfirm")}</FieldLabel>
      </Field>
      <Button onClick={finish} disabled={!saved}>
        {t("finish")}
      </Button>
    </AuthCard>
  );
}
