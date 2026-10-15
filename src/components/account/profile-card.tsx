"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FormError } from "@/components/auth/form-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";
import { authErrorKey, type AuthErrorKey } from "@/lib/auth/errors";

export function ProfileCard({ name, email }: { name: string; email: string }) {
  const t = useTranslations("MyAccount.profile");
  const common = useTranslations("Common");
  const router = useRouter();
  const [value, setValue] = useState(name);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorKey, setErrorKey] = useState<AuthErrorKey | null>(null);

  const trimmed = value.trim();
  const canSave = !pending && trimmed !== "" && trimmed !== name;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    setPending(true);
    setSaved(false);
    setErrorKey(null);
    try {
      const { error } = await authClient.updateUser({ name: trimmed });
      if (error) {
        setErrorKey(authErrorKey(error));
        return;
      }
      setValue(trimmed);
      setSaved(true);
      // The header reads the name from the server.
      router.refresh();
    } catch {
      setErrorKey("NETWORK");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="flex flex-col gap-6">
          <FormError errorKey={errorKey} />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="account-name">{t("name")}</FieldLabel>
              <Input
                id="account-name"
                name="name"
                dir="auto"
                autoComplete="name"
                required
                maxLength={100}
                value={value}
                disabled={pending}
                onChange={(event) => {
                  setValue(event.target.value);
                  setSaved(false);
                }}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="account-email">{t("email")}</FieldLabel>
              <Input id="account-email" dir="auto" value={email} readOnly disabled />
              <FieldDescription>{t("emailHelp")}</FieldDescription>
            </Field>
          </FieldGroup>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={!canSave}>
              {pending ? common("saving") : common("save")}
            </Button>
            {saved ? (
              <p role="status" className="text-sm text-muted-foreground">
                {t("saved")}
              </p>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
