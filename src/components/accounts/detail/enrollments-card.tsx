"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FormError } from "@/components/auth/form-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { endEnrollment, grantEnrollment } from "@/lib/accounts/enrollment-actions";
import { grantableCourses } from "@/lib/accounts/enrollment-picker";
import type { AdminEnrollment, CatalogCourse } from "@/lib/accounts/detail-types";
import { formatDateTimeUtc } from "@/lib/accounts/format";
import { ConfirmDialog } from "./confirm-dialog";
import { CourseName } from "./course-name";
import { useAccountAction } from "./use-account-action";

// `catalog` is null when the Catalog could not be loaded: the table still works, only the picker
// is unavailable.
export function EnrollmentsCard({
  accountId,
  enrollments,
  catalog,
}: {
  accountId: string;
  enrollments: AdminEnrollment[];
  catalog: CatalogCourse[] | null;
}) {
  const t = useTranslations("AccountDetail.enrollments");
  const endAction = useAccountAction();
  const grantAction = useAccountAction();
  const [ending, setEnding] = useState<AdminEnrollment | null>(null);
  const [courseId, setCourseId] = useState("");

  const options = catalog ? grantableCourses(catalog, enrollments) : [];
  // A refresh can remove the chosen Course from the options (it was granted): clear the choice.
  const selected = options.some((course) => course.id === courseId) ? courseId : "";

  async function confirmEnd() {
    if (!ending) return;
    const result = await endAction.run(() => endEnrollment(accountId, ending.course.id), t("ended"));
    if (result.ok) setEnding(null);
  }

  async function grant() {
    if (!selected) return;
    endAction.reset();
    const result = await grantAction.run(() => grantEnrollment(accountId, selected), t("granted"));
    if (result.ok) setCourseId("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {enrollments.length === 0 ? (
          <div className="flex flex-col items-center gap-1 rounded-md border border-dashed px-6 py-8 text-center">
            <p className="font-medium">{t("emptyTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("emptyDescription")}</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.course")}</TableHead>
                  <TableHead>{t("columns.enrolled")}</TableHead>
                  <TableHead>{t("columns.ended")}</TableHead>
                  <TableHead>{t("columns.endReason")}</TableHead>
                  <TableHead className="text-right">{t("columns.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell>
                      <CourseName code={enrollment.course.code} name={enrollment.course.name} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTimeUtc(enrollment.enrolledAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {enrollment.endedAt ? (
                        formatDateTimeUtc(enrollment.endedAt)
                      ) : (
                        <Badge variant="secondary">{t("active")}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {enrollment.endReason ? t(`endReasons.${enrollment.endReason}`) : null}
                    </TableCell>
                    <TableCell className="text-right">
                      {enrollment.endedAt === null ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          aria-label={t("endLabel", { course: enrollment.course.code })}
                          onClick={() => {
                            endAction.reset();
                            grantAction.reset();
                            setEnding(enrollment);
                          }}
                        >
                          {t("end")}
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {endAction.done ? (
          <p role="status" className="text-sm text-muted-foreground">
            {endAction.done}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 border-t pt-6">
          <div>
            <h3 className="font-medium">{t("grantTitle")}</h3>
            <p className="text-sm text-muted-foreground">{t("grantDescription")}</p>
          </div>
          {catalog === null ? (
            <p className="text-sm text-muted-foreground">{t("catalogFailed")}</p>
          ) : catalog.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("catalogEmpty")}</p>
          ) : options.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noGrantable")}</p>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <Field className="w-full sm:w-80">
                <FieldLabel htmlFor="grant-course">{t("course")}</FieldLabel>
                <Select value={selected} onValueChange={setCourseId} disabled={grantAction.pending}>
                  <SelectTrigger id="grant-course" className="w-full">
                    <SelectValue placeholder={t("chooseCourse")} />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        <span dir="auto">
                          {course.code} {course.name.en}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Button type="button" disabled={!selected || grantAction.pending} onClick={grant}>
                {grantAction.pending ? t("granting") : t("grant")}
              </Button>
            </div>
          )}
          <FormError errorKey={grantAction.errorKey} />
          {grantAction.done ? (
            <p role="status" className="text-sm text-muted-foreground">
              {grantAction.done}
            </p>
          ) : null}
        </div>
      </CardContent>
      <ConfirmDialog
        open={ending !== null}
        onOpenChange={(open) => {
          if (!open) setEnding(null);
        }}
        title={t("endTitle")}
        description={
          ending ? t("endDescription", { course: `${ending.course.code} ${ending.course.name.en}` }) : ""
        }
        confirmLabel={t("endConfirm")}
        pendingLabel={t("ending")}
        pending={endAction.pending}
        errorKey={endAction.errorKey}
        onConfirm={confirmEnd}
      />
    </Card>
  );
}
