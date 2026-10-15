"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FormError } from "@/components/auth/form-error";
import { useAccountAction } from "@/components/accounts/detail/use-account-action";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import type { AuthErrorKey } from "@/lib/auth/errors";
import { createCourse } from "@/lib/catalog/api";
import {
  courseCreateBody,
  EMPTY_COURSE_VALUES,
  validateCourseForm,
  type CourseValues,
} from "@/lib/catalog/course-form";
import type { CatalogField } from "@/lib/catalog/errors";
import { hasIssues, type FormIssues } from "@/lib/catalog/form";
import { suggestSlug } from "@/lib/catalog/slug";
import type { AdminInstitution } from "@/lib/catalog/types";
import { useFieldMessage } from "../entity-fields";
import { CourseFields, type CourseFieldName } from "./course-fields";

// Adds a Course. It is created as a Draft; on success the dialog opens the new Course's page, where
// its Chapters, status and the rest are managed. The form is mounted only while the dialog is open,
// so each opening starts clean. `institutions` is null when they could not be loaded.
export function CourseDialog({
  institutions,
  defaultInstitutionId,
  open,
  onOpenChange,
}: {
  institutions: AdminInstitution[] | null;
  defaultInstitutionId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("Catalog.courses.dialog");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("createTitle")}</DialogTitle>
          <DialogDescription>{t("createDescription")}</DialogDescription>
        </DialogHeader>
        <CourseForm
          institutions={institutions}
          defaultInstitutionId={defaultInstitutionId}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function CourseForm({
  institutions,
  defaultInstitutionId,
  onDone,
}: {
  institutions: AdminInstitution[] | null;
  defaultInstitutionId?: string;
  onDone: () => void;
}) {
  const t = useTranslations("Catalog.courses.dialog");
  const common = useTranslations("Common");
  const router = useRouter();
  const action = useAccountAction();

  const [values, setValues] = useState<CourseValues>({
    ...EMPTY_COURSE_VALUES,
    institutionId: defaultInstitutionId ?? "",
  });
  const [slugTouched, setSlugTouched] = useState(false);
  const [issues, setIssues] = useState<FormIssues>({});
  const [backendErrors, setBackendErrors] = useState<Partial<Record<CatalogField, AuthErrorKey>>>({});
  const [createdId, setCreatedId] = useState<string | null>(null);
  const messageFor = useFieldMessage(issues, backendErrors);

  const available = institutions ?? [];
  const canSave = !action.pending && available.length > 0;

  // Once the write succeeded and the refreshed list has arrived, open the new Course.
  const { done, pending } = action;
  useEffect(() => {
    if (done === null || pending) return;
    onDone();
    if (createdId) router.push(`/catalog/courses/${encodeURIComponent(createdId)}`);
  }, [done, pending, onDone, createdId, router]);

  function change(field: CourseFieldName, value: string) {
    // The slug follows the English name until the Admin edits the slug themselves.
    if (field === "slug") setSlugTouched(true);
    setValues((current) => {
      const next = { ...current, [field]: value };
      if (field === "nameEn" && !slugTouched) next.slug = suggestSlug(value);
      return next;
    });
    setIssues((current) => ({ ...current, [field]: undefined }));
    setBackendErrors((current) => ({ ...current, [field]: undefined }));
    action.reset();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    const found = validateCourseForm(values);
    setIssues(found);
    const body = courseCreateBody(values);
    if (hasIssues(found) || !body) return;

    setBackendErrors({});
    await action.run(async () => {
      const outcome = await createCourse(body);
      if (outcome.ok) setCreatedId(outcome.id);
      // A field error is shown on its own field, not as a form error.
      else if (outcome.field) setBackendErrors({ [outcome.field]: outcome.errorKey });
      return outcome;
    }, t("created"));
  }

  const fieldFailed = Object.values(backendErrors).some(Boolean);
  const formError = fieldFailed ? null : action.errorKey;

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      <FormError errorKey={formError} />
      {institutions === null ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{t("institutionsFailed")}</AlertDescription>
        </Alert>
      ) : institutions.length === 0 ? (
        <Alert role="status">
          <AlertDescription>{t("noInstitutions")}</AlertDescription>
        </Alert>
      ) : null}
      <FieldGroup>
        <CourseFields
          idPrefix="new-course"
          mode="create"
          values={values}
          institutions={available}
          disabled={action.pending}
          messageFor={messageFor}
          onChange={change}
        />
      </FieldGroup>
      <DialogFooter>
        <Button type="button" variant="outline" disabled={action.pending} onClick={onDone}>
          {common("cancel")}
        </Button>
        <Button type="submit" disabled={!canSave}>
          {action.pending ? common("saving") : t("create")}
        </Button>
      </DialogFooter>
    </form>
  );
}
