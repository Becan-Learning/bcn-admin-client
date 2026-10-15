"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { FormError } from "@/components/auth/form-error";
import { useAccountAction } from "@/components/accounts/detail/use-account-action";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AuthErrorKey } from "@/lib/auth/errors";
import { createMajor, editMajor } from "@/lib/catalog/api";
import type { CatalogField } from "@/lib/catalog/errors";
import {
  diffMajor,
  hasChanges,
  hasIssues,
  majorCreateBody,
  validateForm,
  type FormIssues,
  type MajorValues,
} from "@/lib/catalog/form";
import { suggestSlug } from "@/lib/catalog/slug";
import type { AdminInstitution, AdminMajor } from "@/lib/catalog/types";
import {
  EntityFields,
  useFieldMessage,
  type EntityFieldName,
  type EntityFieldValues,
} from "./entity-fields";

// Create (`major` is null) or edit one Major. A new Major starts under `institutionId`; an edit may
// move it to another Institution unless Accounts hold it (the backend then answers MAJOR_IN_USE).
export function MajorDialog({
  major,
  institutionId,
  institutions,
  open,
  onOpenChange,
}: {
  major: AdminMajor | null;
  institutionId: string;
  institutions: AdminInstitution[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("Catalog.majors.dialog");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{major ? t("editTitle") : t("createTitle")}</DialogTitle>
          <DialogDescription>{major ? t("editDescription") : t("createDescription")}</DialogDescription>
        </DialogHeader>
        <MajorForm
          major={major}
          institutionId={institutionId}
          institutions={institutions}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function MajorForm({
  major,
  institutionId,
  institutions,
  onDone,
}: {
  major: AdminMajor | null;
  institutionId: string;
  institutions: AdminInstitution[];
  onDone: () => void;
}) {
  const t = useTranslations("Catalog.majors.dialog");
  const common = useTranslations("Common");
  const action = useAccountAction();

  const initial: MajorValues = {
    institutionId: major?.institutionId ?? institutionId,
    nameEn: major?.name.en ?? "",
    nameAr: major?.name.ar ?? "",
    sortOrder: String(major?.sortOrder ?? 0),
  };
  const [id, setId] = useState(major?.id ?? "");
  const [idTouched, setIdTouched] = useState(false);
  const [values, setValues] = useState<MajorValues>(initial);
  const [issues, setIssues] = useState<FormIssues>({});
  const [backendErrors, setBackendErrors] = useState<Partial<Record<CatalogField, AuthErrorKey>>>({});
  const messageFor = useFieldMessage(issues, backendErrors);

  const changes = major ? diffMajor(initial, values) : null;
  const canSave = !action.pending && (changes === null || hasChanges(changes));
  const accountsHoldIt = (major?.counts.accounts ?? 0) > 0;

  // Close once the write succeeded and the refreshed list has arrived.
  const { done, pending } = action;
  useEffect(() => {
    if (done !== null && !pending) onDone();
  }, [done, pending, onDone]);

  // The id suggested for a new Major: its Institution id, then the English name, by the seed's habit.
  function suggestedId(nameEn: string, parent: string) {
    return suggestSlug(nameEn, parent);
  }

  function clearField(field: CatalogField) {
    setIssues((current) => ({ ...current, [field]: undefined }));
    setBackendErrors((current) => ({ ...current, [field]: undefined }));
    action.reset();
  }

  function change(field: EntityFieldName, value: string) {
    if (field === "id") {
      setId(value);
      setIdTouched(true);
    } else {
      setValues((current) => ({ ...current, [field]: value }));
      if (field === "nameEn" && !major && !idTouched) {
        setId(suggestedId(value, values.institutionId));
      }
    }
    clearField(field);
  }

  function changeInstitution(value: string) {
    setValues((current) => ({ ...current, institutionId: value }));
    if (!major && !idTouched) setId(suggestedId(values.nameEn, value));
    clearField("institutionId");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    const found = validateForm(values, major ? null : id, { needsInstitution: true });
    setIssues(found);
    if (hasIssues(found)) return;

    setBackendErrors({});
    await action.run(async () => {
      const outcome = major
        ? await editMajor(major.id, changes ?? {})
        : await createMajor(majorCreateBody(id, values));
      if (!outcome.ok && outcome.field) setBackendErrors({ [outcome.field]: outcome.errorKey });
      return outcome;
    }, t("saved"));
  }

  const fieldFailed = Object.values(backendErrors).some(Boolean);
  const formError = fieldFailed ? null : action.errorKey;
  const entityValues: EntityFieldValues = {
    id,
    nameEn: values.nameEn,
    nameAr: values.nameAr,
    sortOrder: values.sortOrder,
  };
  const institutionMessage = messageFor("institutionId");

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      <FormError errorKey={formError} />
      <FieldGroup>
        <Field data-invalid={Boolean(institutionMessage) || undefined}>
          <FieldLabel htmlFor="major-institution">{t("institution")}</FieldLabel>
          <Select
            value={values.institutionId}
            disabled={action.pending || accountsHoldIt}
            onValueChange={changeInstitution}
          >
            <SelectTrigger
              id="major-institution"
              className="w-full"
              aria-invalid={Boolean(institutionMessage) || undefined}
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
          {accountsHoldIt ? <FieldDescription>{t("institutionLocked")}</FieldDescription> : null}
          <FieldError>{institutionMessage}</FieldError>
        </Field>
        <EntityFields
          idMode={major ? "edit" : "create"}
          values={entityValues}
          idHelp={t("idHelp")}
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
          {action.pending ? common("saving") : major ? t("save") : t("create")}
        </Button>
      </DialogFooter>
    </form>
  );
}
