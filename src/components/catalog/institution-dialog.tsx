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
import { FieldGroup } from "@/components/ui/field";
import type { AuthErrorKey } from "@/lib/auth/errors";
import { createInstitution, editInstitution } from "@/lib/catalog/api";
import type { CatalogField } from "@/lib/catalog/errors";
import {
  diffInstitution,
  hasChanges,
  hasIssues,
  institutionCreateBody,
  validateForm,
  type FormIssues,
  type InstitutionValues,
} from "@/lib/catalog/form";
import { suggestSlug } from "@/lib/catalog/slug";
import type { AdminInstitution } from "@/lib/catalog/types";
import {
  EntityFields,
  useFieldMessage,
  type EntityFieldName,
  type EntityFieldValues,
} from "./entity-fields";

// Create (`institution` is null) or edit one Institution. The form is only mounted while the dialog is
// open, so every opening starts from the current data with no leftover errors.
export function InstitutionDialog({
  institution,
  open,
  onOpenChange,
}: {
  institution: AdminInstitution | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("Catalog.institutions.dialog");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{institution ? t("editTitle") : t("createTitle")}</DialogTitle>
          <DialogDescription>
            {institution ? t("editDescription") : t("createDescription")}
          </DialogDescription>
        </DialogHeader>
        <InstitutionForm institution={institution} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function InstitutionForm({
  institution,
  onDone,
}: {
  institution: AdminInstitution | null;
  onDone: () => void;
}) {
  const t = useTranslations("Catalog.institutions.dialog");
  const common = useTranslations("Common");
  const action = useAccountAction();

  const initial: InstitutionValues = {
    nameEn: institution?.name.en ?? "",
    nameAr: institution?.name.ar ?? "",
    sortOrder: String(institution?.sortOrder ?? 0),
  };
  const [id, setId] = useState(institution?.id ?? "");
  const [idTouched, setIdTouched] = useState(false);
  const [values, setValues] = useState<InstitutionValues>(initial);
  const [issues, setIssues] = useState<FormIssues>({});
  const [backendErrors, setBackendErrors] = useState<Partial<Record<CatalogField, AuthErrorKey>>>({});
  const messageFor = useFieldMessage(issues, backendErrors);

  const changes = institution ? diffInstitution(initial, values) : null;
  const canSave = !action.pending && (changes === null || hasChanges(changes));

  // Close once the write succeeded and the refreshed list has arrived.
  const { done, pending } = action;
  useEffect(() => {
    if (done !== null && !pending) onDone();
  }, [done, pending, onDone]);

  function change(field: EntityFieldName, value: string) {
    if (field === "id") {
      setId(value);
      setIdTouched(true);
    } else {
      setValues((current) => ({ ...current, [field]: value }));
      // The id follows the English name until the Admin edits the id themselves.
      if (field === "nameEn" && !institution && !idTouched) setId(suggestSlug(value));
    }
    setIssues((current) => ({ ...current, [field]: undefined }));
    setBackendErrors((current) => ({ ...current, [field]: undefined }));
    action.reset();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    const found = validateForm(values, institution ? null : id);
    setIssues(found);
    if (hasIssues(found)) return;

    setBackendErrors({});
    await action.run(async () => {
      const outcome = institution
        ? await editInstitution(institution.id, changes ?? {})
        : await createInstitution(institutionCreateBody(id, values));
      // A field error is shown on its own field, not as a form error.
      if (!outcome.ok && outcome.field) setBackendErrors({ [outcome.field]: outcome.errorKey });
      return outcome;
    }, t("saved"));
  }

  const fieldFailed = Object.values(backendErrors).some(Boolean);
  const formError = fieldFailed ? null : action.errorKey;
  const entityValues: EntityFieldValues = { id, ...values };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      <FormError errorKey={formError} />
      <FieldGroup>
        <EntityFields
          idMode={institution ? "edit" : "create"}
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
          {action.pending ? common("saving") : institution ? t("save") : t("create")}
        </Button>
      </DialogFooter>
    </form>
  );
}
