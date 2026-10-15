"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";
import { authErrorKey, type AuthClientError, type AuthErrorKey } from "@/lib/auth/errors";
import { FormError } from "./form-error";
import { TOTP_LENGTH, TotpField } from "./totp-field";

type Mode = "totp" | "backup";

// Finishes a password sign-in that the backend held back for a second factor. There is no "trust
// this device" choice: every sign-in asks again.
export function TwoFactorForm() {
  const t = useTranslations("TwoFactor");
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("totp");
  const [code, setCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [pending, setPending] = useState(false);
  const [errorKey, setErrorKey] = useState<AuthErrorKey | null>(null);

  async function verify(value: string) {
    setPending(true);
    setErrorKey(null);
    try {
      const result: { error: AuthClientError } =
        mode === "totp"
          ? await authClient.twoFactor.verifyTotp({ code: value })
          : await authClient.twoFactor.verifyBackupCode({ code: value.trim() });
      if (result.error) {
        setErrorKey(authErrorKey(result.error));
        setCode("");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setErrorKey("NETWORK");
    } finally {
      setPending(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = mode === "totp" ? code : backupCode;
    if (mode === "totp" ? value.length === TOTP_LENGTH : value.trim() !== "") void verify(value);
  }

  function switchMode() {
    setMode(mode === "totp" ? "backup" : "totp");
    setCode("");
    setBackupCode("");
    setErrorKey(null);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <FormError errorKey={errorKey} />
      <FieldGroup>
        {mode === "totp" ? (
          <Field>
            <FieldLabel htmlFor="code">{t("codeLabel")}</FieldLabel>
            <TotpField
              id="code"
              value={code}
              onChange={setCode}
              onComplete={(complete) => void verify(complete)}
              disabled={pending}
              autoFocus
            />
          </Field>
        ) : (
          <Field>
            <FieldLabel htmlFor="backup-code">{t("backupCodeLabel")}</FieldLabel>
            <Input
              id="backup-code"
              dir="ltr"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              value={backupCode}
              onChange={(event) => setBackupCode(event.target.value)}
              disabled={pending}
              autoFocus
              required
            />
          </Field>
        )}
      </FieldGroup>
      <Button type="submit" disabled={pending}>
        {pending ? t("verifying") : t("verify")}
      </Button>
      <div className="flex flex-col items-start gap-2 text-sm">
        <Button type="button" variant="link" className="h-auto p-0" onClick={switchMode}>
          {mode === "totp" ? t("useBackupCode") : t("useAuthenticator")}
        </Button>
        <Button asChild variant="link" className="h-auto p-0">
          <Link href="/sign-in">{t("backToSignIn")}</Link>
        </Button>
      </div>
    </form>
  );
}
