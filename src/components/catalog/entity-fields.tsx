"use client";

import { useTranslations } from "next-intl";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { AuthErrorKey } from "@/lib/auth/errors";
import { NAME_MAX_LENGTH, type FormIssue, type FormIssues } from "@/lib/catalog/form";
import type { CatalogField } from "@/lib/catalog/errors";
import { SLUG_MAX_LENGTH } from "@/lib/catalog/slug";

// The fields an Institution and a Major share: id (typed once, on create), the two names and the sort
// order. Both forms use it, and so will the Course form, which has the same shape.
export type EntityFieldValues = {
  id: string;
  nameEn: string;
  nameAr: string;
  sortOrder: string;
};

export type EntityFieldName = "id" | "nameEn" | "nameAr" | "sortOrder";

export function useFieldMessage(
  issues: FormIssues,
  backendErrors: Partial<Record<CatalogField, AuthErrorKey>>,
) {
  const errors = useTranslations("Errors");
  const form = useTranslations("Catalog.form");
  return (field: CatalogField): string | undefined => {
    const key = backendErrors[field];
    if (key) return errors(key);
    const issue: FormIssue | undefined = issues[field];
    return issue ? form(`issues.${issue}`) : undefined;
  };
}

export function EntityFields({
  idMode,
  values,
  idHelp,
  disabled,
  messageFor,
  onChange,
}: {
  // "create": the id is typed. "edit": the id is shown and cannot change.
  idMode: "create" | "edit";
  values: EntityFieldValues;
  idHelp: string;
  disabled: boolean;
  messageFor: (field: CatalogField) => string | undefined;
  onChange: (field: EntityFieldName, value: string) => void;
}) {
  const t = useTranslations("Catalog.form");
  const invalid = (field: CatalogField) => Boolean(messageFor(field)) || undefined;

  return (
    <>
      <Field data-invalid={invalid("id")}>
        <FieldLabel htmlFor="catalog-id">{t("id")}</FieldLabel>
        <Input
          id="catalog-id"
          dir="ltr"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={SLUG_MAX_LENGTH}
          className="font-mono"
          value={values.id}
          readOnly={idMode === "edit"}
          // Out of the tab order when read-only, so an edit dialog opens on the first field you can change.
          tabIndex={idMode === "edit" ? -1 : undefined}
          disabled={disabled && idMode === "create"}
          aria-invalid={invalid("id")}
          aria-describedby="catalog-id-help"
          onChange={(event) => onChange("id", event.target.value)}
        />
        <FieldDescription id="catalog-id-help">
          {idMode === "edit" ? t("idReadOnly") : idHelp}
        </FieldDescription>
        <FieldError>{messageFor("id")}</FieldError>
      </Field>
      <Field data-invalid={invalid("nameEn")}>
        <FieldLabel htmlFor="catalog-name-en">{t("nameEn")}</FieldLabel>
        <Input
          id="catalog-name-en"
          dir="auto"
          autoComplete="off"
          maxLength={NAME_MAX_LENGTH}
          value={values.nameEn}
          disabled={disabled}
          aria-invalid={invalid("nameEn")}
          onChange={(event) => onChange("nameEn", event.target.value)}
        />
        <FieldError>{messageFor("nameEn")}</FieldError>
      </Field>
      <Field data-invalid={invalid("nameAr")}>
        <FieldLabel htmlFor="catalog-name-ar">{t("nameAr")}</FieldLabel>
        <Input
          id="catalog-name-ar"
          dir="auto"
          lang="ar"
          autoComplete="off"
          maxLength={NAME_MAX_LENGTH}
          value={values.nameAr}
          disabled={disabled}
          aria-invalid={invalid("nameAr")}
          onChange={(event) => onChange("nameAr", event.target.value)}
        />
        <FieldError>{messageFor("nameAr")}</FieldError>
      </Field>
      <Field data-invalid={invalid("sortOrder")}>
        <FieldLabel htmlFor="catalog-sort-order">{t("sortOrder")}</FieldLabel>
        <Input
          id="catalog-sort-order"
          dir="ltr"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          className="w-32"
          value={values.sortOrder}
          disabled={disabled}
          aria-invalid={invalid("sortOrder")}
          aria-describedby="catalog-sort-order-help"
          onChange={(event) => onChange("sortOrder", event.target.value)}
        />
        <FieldDescription id="catalog-sort-order-help">{t("sortOrderHelp")}</FieldDescription>
        <FieldError>{messageFor("sortOrder")}</FieldError>
      </Field>
    </>
  );
}
