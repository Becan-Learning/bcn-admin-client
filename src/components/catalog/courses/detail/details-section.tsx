"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { FormError } from "@/components/auth/form-error";
import { ConfirmDialog } from "@/components/accounts/detail/confirm-dialog";
import { useAccountAction } from "@/components/accounts/detail/use-account-action";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import type { AuthErrorKey } from "@/lib/auth/errors";
import { editCourse } from "@/lib/catalog/api";
import {
  changesSlug,
  courseValues,
  diffCourse,
  validateCourseForm,
  type CourseValues,
} from "@/lib/catalog/course-form";
import type { CatalogField } from "@/lib/catalog/errors";
import { hasChanges, hasIssues, type FormIssues } from "@/lib/catalog/form";
import type { AdminCourse, AdminInstitution } from "@/lib/catalog/types";
import { useFieldMessage } from "../../entity-fields";
import { CourseFields, type CourseFieldName } from "../course-fields";

// The Details section: slug, code, names, Institution, icon, tone and sort order. Only the changed
// fields are sent (the backend refuses unknown keys and an empty body). A slug change is confirmed
// first because it changes the links Students use. `institutions` is null when they could not be
// loaded; the Institution is then shown but cannot be changed.
export function CourseDetailsSection({
  course,
  institutions,
}: {
  course: AdminCourse;
  institutions: AdminInstitution[] | null;
}) {
  const t = useTranslations("CourseDetail.details");
  const common = useTranslations("Common");
  const action = useAccountAction();

  const initial = courseValues(course);
  const [values, setValues] = useState<CourseValues>(initial);
  const [issues, setIssues] = useState<FormIssues>({});
  const [backendErrors, setBackendErrors] = useState<Partial<Record<CatalogField, AuthErrorKey>>>({});
  const [confirmingSlug, setConfirmingSlug] = useState(false);
  const messageFor = useFieldMessage(issues, backendErrors);

  const changes = diffCourse(initial, values);
  const canSave = !action.pending && hasChanges(changes);
  const options = institutions ?? [course.institution];

  function change(field: CourseFieldName, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setIssues((current) => ({ ...current, [field]: undefined }));
    setBackendErrors((current) => ({ ...current, [field]: undefined }));
    action.reset();
  }

  async function save() {
    setBackendErrors({});
    const result = await action.run(async () => {
      const outcome = await editCourse(course.id, changes);
      // A field error is shown on its own field, not as a form error.
      if (!outcome.ok && outcome.field) setBackendErrors({ [outcome.field]: outcome.errorKey });
      return outcome;
    }, t("saved"));
    setConfirmingSlug(false);
    // Show what was stored (trimmed text) until the refreshed data arrives.
    if (result.ok) {
      setValues((current) => ({
        ...current,
        slug: current.slug.trim(),
        code: current.code.trim(),
        nameEn: current.nameEn.trim(),
        nameAr: current.nameAr.trim(),
      }));
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    const found = validateCourseForm(values);
    setIssues(found);
    if (hasIssues(found)) return;
    if (changesSlug(changes)) {
      action.reset();
      setConfirmingSlug(true);
      return;
    }
    void save();
  }

  const fieldFailed = Object.values(backendErrors).some(Boolean);
  const formError = fieldFailed ? null : action.errorKey;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex max-w-xl flex-col gap-6" noValidate>
          <FormError errorKey={formError} />
          {institutions === null ? (
            <Alert role="status">
              <AlertDescription>{t("institutionsFailed")}</AlertDescription>
            </Alert>
          ) : null}
          <FieldGroup>
            <CourseFields
              idPrefix="course"
              mode="edit"
              values={values}
              institutions={options}
              institutionLocked={institutions === null}
              disabled={action.pending}
              messageFor={messageFor}
              onChange={change}
            />
          </FieldGroup>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={!canSave}>
              {action.pending && !confirmingSlug ? common("saving") : t("save")}
            </Button>
            {action.done && !confirmingSlug ? (
              <p role="status" className="text-sm text-muted-foreground">
                {action.done}
              </p>
            ) : null}
          </div>
        </form>
      </CardContent>

      <ConfirmDialog
        open={confirmingSlug}
        onOpenChange={setConfirmingSlug}
        title={t("slugDialogTitle")}
        description={t("slugDialogDescription")}
        confirmLabel={t("slugConfirm")}
        pendingLabel={t("slugPending")}
        pending={action.pending}
        errorKey={null}
        onConfirm={() => void save()}
      >
        <p className="text-sm">
          <code dir="ltr" className="font-mono break-all text-muted-foreground line-through">
            {initial.slug}
          </code>{" "}
          <span aria-hidden>{"→"}</span>{" "}
          <code dir="ltr" className="font-mono font-medium break-all">
            {values.slug.trim()}
          </code>
        </p>
      </ConfirmDialog>
    </Card>
  );
}
