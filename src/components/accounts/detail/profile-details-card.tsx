"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { FormError } from "@/components/auth/form-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateProfile } from "@/lib/accounts/account-actions";
import type { Institution } from "@/lib/accounts/types";
import {
  diffProfile,
  hasChanges,
  missingFields,
  normalizeProfile,
  type FieldErrors,
  type ProfileField,
  type ProfileValues,
} from "@/lib/accounts/profile-form";
import type { AuthErrorKey } from "@/lib/auth/errors";
import { useAccountAction } from "./use-account-action";

// Edits name, phone, Institution and Major through Better Auth's `admin.updateUser`. Only the changed
// fields are sent. The backend runs the sign-up checks and answers with a code that lands on its field.
export function ProfileDetailsCard({
  accountId,
  initial,
  institutions,
}: {
  accountId: string;
  initial: ProfileValues;
  institutions: Institution[];
}) {
  const t = useTranslations("AccountDetail.profile");
  const common = useTranslations("Common");
  const errors = useTranslations("Errors");
  const action = useAccountAction();
  const [values, setValues] = useState<ProfileValues>(initial);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<ProfileField>>({});
  const [requiredFields, setRequiredFields] = useState<ProfileField[]>([]);

  const majors = useMemo(
    () => institutions.find((institution) => institution.id === values.institutionId)?.majors ?? [],
    [institutions, values.institutionId],
  );
  const catalogLoaded = institutions.length > 0;
  const changes = diffProfile(initial, values);
  const canSave = !action.pending && hasChanges(changes);

  function update(field: ProfileField, value: string) {
    setValues((current) => {
      const next = { ...current, [field]: value };
      // A Major belongs to one Institution: changing the Institution clears the Major.
      if (field === "institutionId" && value !== current.institutionId) next.majorId = "";
      return next;
    });
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setRequiredFields((current) => current.filter((name) => name !== field));
    action.reset();
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    const missing = missingFields(values);
    setRequiredFields(missing);
    if (missing.length > 0) return;

    setFieldErrors({});
    const result = await action.run(async () => {
      const outcome = await updateProfile(accountId, changes);
      // A field error is shown on its own field, not as a form error.
      if (!outcome.ok && outcome.field) {
        setFieldErrors({ [outcome.field]: outcome.errorKey });
      }
      return outcome;
    }, t("saved"));
    // Show what was stored (trimmed name, repaired phone number) until the refreshed data arrives.
    if (result.ok) setValues(normalizeProfile(values));
  }

  function messageFor(field: ProfileField): string | undefined {
    const key: AuthErrorKey | undefined = fieldErrors[field];
    if (key) return errors(key);
    return requiredFields.includes(field) ? t("required") : undefined;
  }

  const formError = action.errorKey && Object.keys(fieldErrors).length === 0 ? action.errorKey : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="flex max-w-xl flex-col gap-6" noValidate>
          <FormError errorKey={formError} />
          {!catalogLoaded ? (
            <Alert role="status">
              <AlertDescription>{t("catalogUnavailable")}</AlertDescription>
            </Alert>
          ) : null}
          <FieldGroup>
            <Field data-invalid={Boolean(messageFor("name")) || undefined}>
              <FieldLabel htmlFor="profile-name">{t("name")}</FieldLabel>
              <Input
                id="profile-name"
                dir="auto"
                maxLength={100}
                value={values.name}
                disabled={action.pending}
                aria-invalid={Boolean(messageFor("name")) || undefined}
                onChange={(event) => update("name", event.target.value)}
              />
              <FieldError>{messageFor("name")}</FieldError>
            </Field>
            <Field data-invalid={Boolean(messageFor("phoneNumber")) || undefined}>
              <FieldLabel htmlFor="profile-phone">{t("phone")}</FieldLabel>
              <Input
                id="profile-phone"
                type="tel"
                dir="ltr"
                inputMode="tel"
                autoComplete="off"
                value={values.phoneNumber}
                disabled={action.pending}
                aria-invalid={Boolean(messageFor("phoneNumber")) || undefined}
                onChange={(event) => update("phoneNumber", event.target.value)}
              />
              <FieldDescription>{t("phoneHelp")}</FieldDescription>
              <FieldError>{messageFor("phoneNumber")}</FieldError>
            </Field>
            <Field data-invalid={Boolean(messageFor("institutionId")) || undefined}>
              <FieldLabel htmlFor="profile-institution">{t("institution")}</FieldLabel>
              <Select
                value={values.institutionId}
                disabled={action.pending || !catalogLoaded}
                onValueChange={(value) => update("institutionId", value)}
              >
                <SelectTrigger
                  id="profile-institution"
                  className="w-full"
                  aria-invalid={Boolean(messageFor("institutionId")) || undefined}
                >
                  <SelectValue placeholder={t("chooseInstitution")} />
                </SelectTrigger>
                <SelectContent>
                  {institutions.map((institution) => (
                    <SelectItem key={institution.id} value={institution.id}>
                      {institution.name.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError>{messageFor("institutionId")}</FieldError>
            </Field>
            <Field data-invalid={Boolean(messageFor("majorId")) || undefined}>
              <FieldLabel htmlFor="profile-major">{t("major")}</FieldLabel>
              <Select
                value={values.majorId}
                disabled={action.pending || !catalogLoaded || !values.institutionId}
                onValueChange={(value) => update("majorId", value)}
              >
                <SelectTrigger
                  id="profile-major"
                  className="w-full"
                  title={values.institutionId ? undefined : t("majorNeedsInstitution")}
                  aria-invalid={Boolean(messageFor("majorId")) || undefined}
                >
                  <SelectValue placeholder={t("chooseMajor")} />
                </SelectTrigger>
                <SelectContent>
                  {majors.map((major) => (
                    <SelectItem key={major.id} value={major.id}>
                      {major.name.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError>{messageFor("majorId")}</FieldError>
            </Field>
          </FieldGroup>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={!canSave}>
              {action.pending ? common("saving") : t("save")}
            </Button>
            {action.done ? (
              <p role="status" className="text-sm text-muted-foreground">
                {action.done}
              </p>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
