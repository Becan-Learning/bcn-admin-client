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
import { Input } from "@/components/ui/input";
import type { AuthErrorKey } from "@/lib/auth/errors";
import { createChapter, editChapter } from "@/lib/catalog/api";
import {
  chapterCreateBody,
  chapterValues,
  diffChapter,
  EMPTY_CHAPTER_VALUES,
  validateChapterForm,
  type ChapterValues,
} from "@/lib/catalog/chapter-form";
import { hasLiveContent, isNumbered, nextChapterNumber } from "@/lib/catalog/chapter-rules";
import type { CatalogField } from "@/lib/catalog/errors";
import { hasChanges, hasIssues, NAME_MAX_LENGTH, type FormIssues } from "@/lib/catalog/form";
import type { AdminChapter } from "@/lib/catalog/types";
import { useFieldMessage } from "../../../entity-fields";

type FieldName = keyof ChapterValues;

// Adds a Chapter (as a Draft) or edits one. Mount it only while it is open, so each opening starts clean.
// An edit sends only the changed fields (the backend refuses an empty body); Save is off until something
// changed. `chapters` is every Chapter of the Course, for the "next free number" hint.
export function ChapterDialog({
  chapter,
  chapters,
  courseId,
  onClose,
}: {
  // The Chapter to edit, or null to add one.
  chapter: AdminChapter | null;
  chapters: AdminChapter[];
  courseId: string;
  onClose: () => void;
}) {
  const t = useTranslations("CourseDetail.chapters.dialog");
  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{chapter ? t("editTitle") : t("createTitle")}</DialogTitle>
          <DialogDescription>{chapter ? t("editDescription") : t("createDescription")}</DialogDescription>
        </DialogHeader>
        <ChapterForm chapter={chapter} chapters={chapters} courseId={courseId} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}

function ChapterForm({
  chapter,
  chapters,
  courseId,
  onClose,
}: {
  chapter: AdminChapter | null;
  chapters: AdminChapter[];
  courseId: string;
  onClose: () => void;
}) {
  const t = useTranslations("CourseDetail.chapters.dialog");
  const f = useTranslations("CourseDetail.chapters.form");
  const common = useTranslations("Common");
  const action = useAccountAction();
  const mode = chapter ? "edit" : "create";

  const initial = chapter ? chapterValues(chapter) : EMPTY_CHAPTER_VALUES;
  const [values, setValues] = useState<ChapterValues>(initial);
  const [issues, setIssues] = useState<FormIssues>({});
  const [backendErrors, setBackendErrors] = useState<Partial<Record<CatalogField, AuthErrorKey>>>({});
  const messageFor = useFieldMessage(issues, backendErrors);
  const invalid = (field: CatalogField) => Boolean(messageFor(field)) || undefined;
  const next = nextChapterNumber(chapters);
  // Set live reads the lesson count from the live version's lessons_list.json, so it is not editable then.
  const lessonCountLocked = chapter !== null && hasLiveContent(chapter);

  const changes = chapter ? diffChapter(initial, values) : null;
  const canSave = !action.pending && (changes === null || hasChanges(changes));

  // Once the write succeeded and the refreshed list has arrived, close.
  const { done, pending } = action;
  useEffect(() => {
    if (done !== null && !pending) onClose();
  }, [done, pending, onClose]);

  function change(field: FieldName, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setIssues((current) => ({ ...current, [field]: undefined }));
    setBackendErrors((current) => ({ ...current, [field]: undefined }));
    action.reset();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    const found = validateChapterForm(values, mode);
    setIssues(found);
    if (hasIssues(found)) return;

    setBackendErrors({});
    await action.run(async () => {
      let outcome;
      if (chapter && changes) outcome = await editChapter(chapter.id, changes);
      else {
        const body = chapterCreateBody(values);
        if (!body) return { ok: false as const, field: null, errorKey: "INVALID_REQUEST" as const };
        outcome = await createChapter(courseId, body);
      }
      // A field error is shown on its own field, not as a form error.
      if (!outcome.ok && outcome.field) setBackendErrors({ [outcome.field]: outcome.errorKey });
      return outcome;
    }, chapter ? t("saved") : t("created"));
  }

  const fieldFailed = Object.values(backendErrors).some(Boolean);
  const formError = fieldFailed ? null : action.errorKey;
  const numberHelp =
    mode === "create"
      ? f("numberHelpCreate", { next })
      : chapter && isNumbered(chapter.state)
        ? f("numberHelpLive")
        : f("numberHelpOther");

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      <FormError errorKey={formError} />
      <FieldGroup>
        <Field data-invalid={invalid("titleEn")}>
          <FieldLabel htmlFor="chapter-title-en">{f("titleEn")}</FieldLabel>
          <Input
            id="chapter-title-en"
            dir="auto"
            autoComplete="off"
            maxLength={NAME_MAX_LENGTH}
            value={values.titleEn}
            disabled={action.pending}
            aria-invalid={invalid("titleEn")}
            onChange={(event) => change("titleEn", event.target.value)}
          />
          <FieldError>{messageFor("titleEn")}</FieldError>
        </Field>
        <Field data-invalid={invalid("titleAr")}>
          <FieldLabel htmlFor="chapter-title-ar">{f("titleAr")}</FieldLabel>
          <Input
            id="chapter-title-ar"
            dir="auto"
            lang="ar"
            autoComplete="off"
            maxLength={NAME_MAX_LENGTH}
            value={values.titleAr}
            disabled={action.pending}
            aria-invalid={invalid("titleAr")}
            onChange={(event) => change("titleAr", event.target.value)}
          />
          <FieldError>{messageFor("titleAr")}</FieldError>
        </Field>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field data-invalid={invalid("minutes")}>
            <FieldLabel htmlFor="chapter-minutes">{f("minutes")}</FieldLabel>
            <Input
              id="chapter-minutes"
              dir="ltr"
              inputMode="numeric"
              autoComplete="off"
              value={values.minutes}
              disabled={action.pending}
              aria-invalid={invalid("minutes")}
              aria-describedby="chapter-minutes-help"
              onChange={(event) => change("minutes", event.target.value)}
            />
            <FieldDescription id="chapter-minutes-help">{f("minutesHelp")}</FieldDescription>
            <FieldError>{messageFor("minutes")}</FieldError>
          </Field>
          <Field data-invalid={invalid("lessonCount")}>
            <FieldLabel htmlFor="chapter-lessons">{f("lessonCount")}</FieldLabel>
            <Input
              id="chapter-lessons"
              dir="ltr"
              inputMode="numeric"
              autoComplete="off"
              value={values.lessonCount}
              disabled={action.pending || lessonCountLocked}
              aria-invalid={invalid("lessonCount")}
              aria-describedby="chapter-lessons-help"
              onChange={(event) => change("lessonCount", event.target.value)}
            />
            <FieldDescription id="chapter-lessons-help">
              {lessonCountLocked ? f("lessonCountFromContent") : f("lessonCountHelp")}
            </FieldDescription>
            <FieldError>{messageFor("lessonCount")}</FieldError>
          </Field>
        </div>
        <Field data-invalid={invalid("number")}>
          <FieldLabel htmlFor="chapter-number">{f("number")}</FieldLabel>
          <Input
            id="chapter-number"
            dir="ltr"
            inputMode="numeric"
            autoComplete="off"
            className="w-32"
            placeholder={mode === "create" ? f("numberPlaceholder", { next }) : undefined}
            value={values.number}
            disabled={action.pending}
            aria-invalid={invalid("number")}
            aria-describedby="chapter-number-help"
            onChange={(event) => change("number", event.target.value)}
          />
          <FieldDescription id="chapter-number-help">{numberHelp}</FieldDescription>
          <FieldError>{messageFor("number")}</FieldError>
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button type="button" variant="outline" disabled={action.pending} onClick={onClose}>
          {common("cancel")}
        </Button>
        <Button type="submit" disabled={!canSave}>
          {action.pending ? common("saving") : chapter ? t("save") : t("create")}
        </Button>
      </DialogFooter>
    </form>
  );
}
