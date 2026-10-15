"use client";

import { useTranslations } from "next-intl";
import { PencilIcon, PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminMajor, InstitutionWithMajors } from "@/lib/catalog/types";
import { LocalizedName } from "./localized-name";

// One Institution: its names, id, sort order and counts, with its Majors in a table below. Edit and
// "Add Major" are buttons; there is no delete (Institutions and Majors are never deleted).
export function InstitutionCard({
  institution,
  onEditInstitution,
  onAddMajor,
  onEditMajor,
}: {
  institution: InstitutionWithMajors;
  onEditInstitution: () => void;
  onAddMajor: () => void;
  onEditMajor: (major: AdminMajor) => void;
}) {
  const t = useTranslations("Catalog.institutions");
  const m = useTranslations("Catalog.majors");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          <LocalizedName name={institution.name} />
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <code dir="ltr" className="font-mono text-xs">
            {institution.id}
          </code>
          <span>{t("sortOrder", { order: institution.sortOrder })}</span>
        </CardDescription>
        <CardAction>
          <Button
            variant="outline"
            size="sm"
            aria-label={t("editLabel", { name: institution.name.en })}
            onClick={onEditInstitution}
          >
            <PencilIcon aria-hidden />
            {t("edit")}
          </Button>
        </CardAction>
        <div className="col-span-full flex flex-wrap gap-2">
          <Badge variant="secondary">{t("counts.majors", { count: institution.counts.majors })}</Badge>
          <Badge variant="secondary">{t("counts.courses", { count: institution.counts.courses })}</Badge>
          <Badge variant="secondary">{t("counts.accounts", { count: institution.counts.accounts })}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">{m("heading")}</h3>
        {institution.majors.length === 0 ? (
          <p className="text-sm text-muted-foreground">{m("empty")}</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{m("columns.major")}</TableHead>
                  <TableHead className="hidden md:table-cell">{m("columns.id")}</TableHead>
                  <TableHead className="hidden text-end sm:table-cell">{m("columns.order")}</TableHead>
                  <TableHead className="hidden text-end sm:table-cell">{m("columns.accounts")}</TableHead>
                  <TableHead className="w-0">
                    <span className="sr-only">{m("columns.actions")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {institution.majors.map((major) => (
                  <TableRow key={major.id}>
                    <TableCell className="max-w-0 min-w-40 whitespace-normal">
                      <LocalizedName name={major.name} />
                      <p className="mt-1 text-xs text-muted-foreground md:hidden">
                        <code dir="ltr" className="font-mono">
                          {major.id}
                        </code>
                        <span className="sm:hidden">
                          {" · "}
                          {m("sortOrder", { order: major.sortOrder })}
                          {" · "}
                          {m("accountsCount", { count: major.counts.accounts })}
                        </span>
                      </p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <code dir="ltr" className="font-mono text-xs">
                        {major.id}
                      </code>
                    </TableCell>
                    <TableCell className="hidden text-end tabular-nums sm:table-cell">
                      {major.sortOrder}
                    </TableCell>
                    <TableCell className="hidden text-end tabular-nums sm:table-cell">
                      {major.counts.accounts}
                    </TableCell>
                    <TableCell className="text-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={m("editLabel", { name: major.name.en })}
                        onClick={() => onEditMajor(major)}
                      >
                        <PencilIcon aria-hidden />
                        {m("edit")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <div>
          <Button variant="outline" size="sm" onClick={onAddMajor}>
            <PlusIcon aria-hidden />
            {m("add")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
