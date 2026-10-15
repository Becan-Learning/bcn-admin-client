"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";
import { authErrorKey, type AuthErrorKey } from "@/lib/auth/errors";
import { returnPathFromLocation } from "@/lib/auth/return-path";
import { FormError } from "./form-error";

export function SignInForm() {
  const t = useTranslations("SignIn");
  const common = useTranslations("Common");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorKey, setErrorKey] = useState<AuthErrorKey | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setErrorKey(null);
    try {
      const { data, error } = await authClient.signIn.email({
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
      });
      if (error) {
        setErrorKey(authErrorKey(error));
        return;
      }
      // A two-factor sign-in is finished on the challenge page; the client plugin sends us there.
      if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) return;
      router.replace(returnPathFromLocation() ?? "/");
      router.refresh();
    } catch {
      setErrorKey("NETWORK");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <FormError errorKey={errorKey} />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">{common("email")}</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            placeholder={t("emailPlaceholder")}
            required
            disabled={pending}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">{common("password")}</FieldLabel>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="pe-10"
              required
              disabled={pending}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="absolute end-1.5 top-1/2 -translate-y-1/2"
              aria-label={showPassword ? t("hidePassword") : t("showPassword")}
              onClick={() => setShowPassword((shown) => !shown)}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </Button>
          </div>
        </Field>
      </FieldGroup>
      <Button type="submit" disabled={pending}>
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
