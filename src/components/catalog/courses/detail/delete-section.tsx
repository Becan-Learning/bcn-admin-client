"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/accounts/detail/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { AuthErrorKey } from "@/lib/auth/errors";
import { deleteCourse } from "@/lib/catalog/api";
import { deleteBlockers, slugConfirmationMatches } from "@/lib/catalog/course-rules";
import type { AdminCourse } from "@/lib/catalog/types";

// The Delete section. Shown as a button only when the backend says `deletable` (no Enrollment ever, no
// Session ever, no Content version that was live or uploaded); the Admin then types the slug. Otherwise
// one block says why not and points to Archive. If the answer is stale, the backend still refuses with
// 409 COURSE_IN_USE and the dialog shows it. It does not use `useAccountAction`: refreshing the page of
// a Course that no longer exists would only show a not-found flash, so on success it goes to the list.
export function CourseDeleteSection({ course }: { course: AdminCourse }) {
  const t = useTranslations("CourseDetail.delete");
  const router = useRouter();
  const [navigating, startNavigation] = useTransition();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [running, setRunning] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [errorKey, setErrorKey] = useState<AuthErrorKey | null>(null);
  const pending = running || navigating;

  async function confirm() {
    if (!slugConfirmationMatches(typed, course.slug)) return;
    setRunning(true);
    setErrorKey(null);
    try {
      const result = await deleteCourse(course.id);
      if (!result.ok) {
        setErrorKey(result.errorKey);
        return;
      }
      setDeleted(true);
      startNavigation(() => router.replace("/catalog/courses"));
    } finally {
      setRunning(false);
    }
  }

  if (!course.deletable) {
    const blockers = deleteBlockers(course);
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("blockedTitle")}</CardTitle>
          <CardDescription>{t("blockedIntro")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <ul className="list-inside list-disc">
            {blockers.map((blocker) => (
              <li key={blocker}>{t(`blockers.${blocker}`)}</li>
            ))}
          </ul>
          <p className="text-muted-foreground">
            {course.status === "archived" ? t("blockedArchived") : t("blockedArchive")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              setTyped("");
              setErrorKey(null);
              setOpen(true);
            }}
          >
            {t("action")}
          </Button>
        </div>
      </CardContent>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("dialogTitle")}
        description={t("dialogDescription")}
        confirmLabel={t("confirm")}
        pendingLabel={t("pending")}
        pending={pending}
        errorKey={errorKey}
        destructive
        confirmDisabled={!slugConfirmationMatches(typed, course.slug)}
        onConfirm={confirm}
      >
        <Field>
          <FieldLabel htmlFor="delete-confirm-slug">
            {t.rich("typeSlug", {
              slug: course.slug,
              strong: (chunks) => <bdi className="font-mono font-semibold break-all">{chunks}</bdi>,
            })}
          </FieldLabel>
          <Input
            id="delete-confirm-slug"
            dir="ltr"
            className="font-mono"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={typed}
            disabled={pending}
            onChange={(event) => setTyped(event.target.value)}
          />
          {deleted ? <FieldDescription role="status">{t("deleted")}</FieldDescription> : null}
        </Field>
      </ConfirmDialog>
    </Card>
  );
}
