"use client";

import { useTranslations } from "next-intl";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CODE_MAX_LENGTH, type CourseValues } from "@/lib/catalog/course-form";
import type { CatalogField } from "@/lib/catalog/errors";
import { NAME_MAX_LENGTH } from "@/lib/catalog/form";
import { SLUG_MAX_LENGTH } from "@/lib/catalog/slug";
import { COURSE_ICONS, COURSE_TONES } from "@/lib/catalog/types";

export type CourseFieldName = keyof CourseValues;

// The fields of a Course, for the create dialog and the Details card. `institutions` is what the select
// offers; the caller passes only the current Institution (and `institutionLocked`) when the list could not
// be loaded. `idPrefix` keeps the element ids apart if two forms ever share a page.
export function CourseFields({
  idPrefix,
  mode,
  values,
  institutions,
  institutionLocked = false,
  disabled,
  messageFor,
  onChange,
}: {
  idPrefix: string;
  mode: "create" | "edit";
  values: CourseValues;
  institutions: { id: string; name: { en: string } }[];
  institutionLocked?: boolean;
  disabled: boolean;
  messageFor: (field: CatalogField) => string | undefined;
  onChange: (field: CourseFieldName, value: string) => void;
}) {
  const t = useTranslations("Catalog.courses.form");
  const names = useTranslations("Catalog.form");
  const icons = useTranslations("Catalog.courses.icons");
  const tones = useTranslations("Catalog.courses.tones");
  const invalid = (field: CatalogField) => Boolean(messageFor(field)) || undefined;
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <>
      <Field data-invalid={invalid("slug")}>
        <FieldLabel htmlFor={id("slug")}>{t("slug")}</FieldLabel>
        <Input
          id={id("slug")}
          dir="ltr"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={SLUG_MAX_LENGTH}
          className="font-mono"
          value={values.slug}
          disabled={disabled}
          aria-invalid={invalid("slug")}
          aria-describedby={id("slug-help")}
          onChange={(event) => onChange("slug", event.target.value)}
        />
        <FieldDescription id={id("slug-help")}>
          {mode === "create" ? t("slugHelp") : t("slugEditHelp")}
        </FieldDescription>
        <FieldError>{messageFor("slug")}</FieldError>
      </Field>

      <Field data-invalid={invalid("code")}>
        <FieldLabel htmlFor={id("code")}>{t("code")}</FieldLabel>
        <Input
          id={id("code")}
          dir="ltr"
          autoComplete="off"
          spellCheck={false}
          maxLength={CODE_MAX_LENGTH}
          className="w-48"
          value={values.code}
          disabled={disabled}
          aria-invalid={invalid("code")}
          aria-describedby={id("code-help")}
          onChange={(event) => onChange("code", event.target.value)}
        />
        <FieldDescription id={id("code-help")}>{t("codeHelp")}</FieldDescription>
        <FieldError>{messageFor("code")}</FieldError>
      </Field>

      <Field data-invalid={invalid("nameEn")}>
        <FieldLabel htmlFor={id("name-en")}>{names("nameEn")}</FieldLabel>
        <Input
          id={id("name-en")}
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
        <FieldLabel htmlFor={id("name-ar")}>{names("nameAr")}</FieldLabel>
        <Input
          id={id("name-ar")}
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

      <Field data-invalid={invalid("institutionId")}>
        <FieldLabel htmlFor={id("institution")}>{t("institution")}</FieldLabel>
        <Select
          value={values.institutionId}
          disabled={disabled || institutionLocked}
          onValueChange={(value) => onChange("institutionId", value)}
        >
          <SelectTrigger
            id={id("institution")}
            className="w-full"
            aria-invalid={invalid("institutionId")}
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

      <div className="grid gap-6 sm:grid-cols-2">
        <Field data-invalid={invalid("icon")}>
          <FieldLabel htmlFor={id("icon")}>{t("icon")}</FieldLabel>
          <Select
            value={values.icon}
            disabled={disabled}
            onValueChange={(value) => onChange("icon", value)}
          >
            <SelectTrigger id={id("icon")} className="w-full" aria-invalid={invalid("icon")}>
              <SelectValue placeholder={t("chooseIcon")} />
            </SelectTrigger>
            <SelectContent>
              {COURSE_ICONS.map((icon) => (
                <SelectItem key={icon} value={icon}>
                  {icons(icon)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError>{messageFor("icon")}</FieldError>
        </Field>
        <Field data-invalid={invalid("tone")}>
          <FieldLabel htmlFor={id("tone")}>{t("tone")}</FieldLabel>
          <Select
            value={values.tone}
            disabled={disabled}
            onValueChange={(value) => onChange("tone", value)}
          >
            <SelectTrigger id={id("tone")} className="w-full" aria-invalid={invalid("tone")}>
              <SelectValue placeholder={t("chooseTone")} />
            </SelectTrigger>
            <SelectContent>
              {COURSE_TONES.map((tone) => (
                <SelectItem key={tone} value={tone}>
                  {tones(tone)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError>{messageFor("tone")}</FieldError>
        </Field>
        <p className="text-sm text-muted-foreground sm:col-span-2">{t("look")}</p>
      </div>

      <Field data-invalid={invalid("sortOrder")}>
        <FieldLabel htmlFor={id("sort-order")}>{names("sortOrder")}</FieldLabel>
        <Input
          id={id("sort-order")}
          dir="ltr"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          className="w-32"
          value={values.sortOrder}
          disabled={disabled}
          aria-invalid={invalid("sortOrder")}
          aria-describedby={id("sort-order-help")}
          onChange={(event) => onChange("sortOrder", event.target.value)}
        />
        <FieldDescription id={id("sort-order-help")}>{names("sortOrderHelp")}</FieldDescription>
        <FieldError>{messageFor("sortOrder")}</FieldError>
      </Field>
    </>
  );
}
