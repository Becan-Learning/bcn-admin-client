"use client";

import { Fragment, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCount } from "@/lib/insights/format";
import type { InstitutionRow } from "@/lib/insights/types";
import { ExpandToggle } from "./expand-toggle";
import { LocalizedName } from "./localized-name";

// Students (all time) and Signups (selected range) per Institution, each opening to its Majors.
export function InstitutionsTable({ institutions }: { institutions: InstitutionRow[] }) {
  const t = useTranslations("Insights.institutions");
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());

  const toggle = (key: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {institutions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("institution")}</TableHead>
                <TableHead className="text-end">{t("students")}</TableHead>
                <TableHead className="text-end">{t("signups")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {institutions.map((institution) => {
                const key = institution.id;
                const expanded = open.has(key);
                const name = institution.name.en;
                const expandable = institution.majors.length > 0;
                return (
                  <Fragment key={key}>
                    <TableRow>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {expandable ? (
                            <ExpandToggle
                              expanded={expanded}
                              label={t(expanded ? "collapse" : "expand", { name })}
                              onToggle={() => toggle(key)}
                            />
                          ) : (
                            // Keeps the names of rows without Majors aligned with the others.
                            <span aria-hidden className="size-8 shrink-0" />
                          )}
                          <LocalizedName name={institution.name} />
                        </div>
                      </TableCell>
                      <TableCell className="text-end tabular-nums">{formatCount(institution.students)}</TableCell>
                      <TableCell className="text-end tabular-nums">{formatCount(institution.signups)}</TableCell>
                    </TableRow>
                    {expanded
                      ? institution.majors.map((major) => (
                          <TableRow key={major.id} className="bg-muted/30">
                            <TableCell className="ps-12">
                              <LocalizedName name={major.name} />
                            </TableCell>
                            <TableCell className="text-end tabular-nums">{formatCount(major.students)}</TableCell>
                            <TableCell className="text-end tabular-nums">{formatCount(major.signups)}</TableCell>
                          </TableRow>
                        ))
                      : null}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
