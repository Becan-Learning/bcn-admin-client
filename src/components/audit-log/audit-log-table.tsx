import Link from "next/link";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { actionLabelKey, targetTypeLabelKey } from "@/lib/audit-log/labels";
import type { AuditEntry } from "@/lib/audit-log/api";
import { AuditEntryChanges } from "./audit-entry-changes";

const timeFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "medium" });

function Time({ iso }: { iso: string }) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return <span>{iso}</span>;
  // Shown in the Admin's local time; the absolute value is on hover.
  return (
    <time dateTime={iso} title={iso} className="whitespace-nowrap">
      {timeFormat.format(date)}
    </time>
  );
}

function Actor({ actor }: { actor: AuditEntry["actor"] }) {
  const t = useTranslations("AuditLog");
  if (!actor) return <span className="text-muted-foreground">{t("removedAdmin")}</span>;
  return (
    <div className="grid">
      <span className="font-medium">
        <bdi>{actor.name}</bdi>
      </span>
      <span className="text-xs text-muted-foreground">
        <bdi>{actor.email}</bdi>
      </span>
    </div>
  );
}

function Action({ entry }: { entry: AuditEntry }) {
  const t = useTranslations("AuditLog");
  const names = useTranslations("AuditLog.actions");
  const key = actionLabelKey(entry.action);
  return (
    <div className="grid gap-0.5">
      <span>{key ? names(key) : entry.action}</span>
      {entry.reason ? (
        <span className="text-xs text-muted-foreground">
          {t("reason", { reason: `\u2068${entry.reason}\u2069` })}
        </span>
      ) : null}
    </div>
  );
}

// The page that shows the target, when there is one. A removed Account or a deleted Course or Chapter has none.
function targetHref(entry: AuditEntry): string | null {
  const id = encodeURIComponent(entry.targetId);
  if (entry.targetType === "account" && entry.action !== "account.remove") return `/accounts/${id}`;
  if (entry.targetType === "course" && entry.action !== "course.delete") return `/catalog/courses/${id}`;
  if (entry.targetType === "chapter" && entry.action !== "chapter.delete") return `/catalog/chapters/${id}`;
  return null;
}

function Target({ entry }: { entry: AuditEntry }) {
  const types = useTranslations("AuditLog.targetTypes");
  const typeKey = targetTypeLabelKey(entry.targetType);
  const href = targetHref(entry);
  return (
    <div className="grid gap-0.5">
      <span className="text-xs text-muted-foreground">
        {typeKey ? types(typeKey) : entry.targetType}
      </span>
      {href ? (
        <Link
          href={href}
          dir="ltr"
          className="font-mono text-xs break-all underline-offset-4 hover:underline"
        >
          {entry.targetId}
        </Link>
      ) : (
        <span dir="ltr" className="font-mono text-xs break-all">
          {entry.targetId}
        </span>
      )}
    </div>
  );
}

function Header() {
  const t = useTranslations("AuditLog.columns");
  return (
    <TableHeader>
      <TableRow>
        <TableHead>{t("time")}</TableHead>
        <TableHead>{t("actor")}</TableHead>
        <TableHead>{t("action")}</TableHead>
        <TableHead>{t("target")}</TableHead>
        <TableHead>{t("changes")}</TableHead>
      </TableRow>
    </TableHeader>
  );
}

export function AuditLogTable({ entries }: { entries: AuditEntry[] }) {
  return (
    <Table>
      <Header />
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id} className="align-top">
            <TableCell>
              <Time iso={entry.createdAt} />
            </TableCell>
            <TableCell>
              <Actor actor={entry.actor} />
            </TableCell>
            <TableCell>
              <Action entry={entry} />
            </TableCell>
            <TableCell>
              <Target entry={entry} />
            </TableCell>
            <TableCell className="whitespace-normal">
              <AuditEntryChanges before={entry.before} after={entry.after} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function AuditLogTableSkeleton() {
  const t = useTranslations("AuditLog");
  return (
    <div role="status" aria-label={t("loadingEntries")}>
      <Table>
        <Header />
        <TableBody>
          {Array.from({ length: 8 }, (_, row) => (
            <TableRow key={row}>
              {Array.from({ length: 5 }, (_, cell) => (
                <TableCell key={cell}>
                  <Skeleton className="h-5 w-full max-w-40" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

