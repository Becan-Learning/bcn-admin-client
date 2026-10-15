import { useTranslations } from "next-intl";
import { ArrowRightIcon } from "lucide-react";
import { diffAuditValues, type AuditValues } from "@/lib/audit-log/diff";
import { fieldLabelKey } from "@/lib/audit-log/labels";

function Value({ value }: { value: unknown }) {
  const common = useTranslations("Common");
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">{common("empty")}</span>;
  }
  if (typeof value === "boolean") return <span>{value ? common("yes") : common("no")}</span>;
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return (
    <bdi className="break-words">{text}</bdi>
  );
}

// The changed keys of an entry, before then after. Names and ban reasons are user text, so the
// values are isolated in a `<bdi>`.
export function AuditEntryChanges({ before, after }: { before: AuditValues; after: AuditValues }) {
  const t = useTranslations("AuditLog");
  const fields = useTranslations("AuditLog.fields");
  const changes = diffAuditValues(before, after);
  const labelOf = (key: string) => {
    const labelKey = fieldLabelKey(key);
    return labelKey ? fields(labelKey) : key;
  };

  if (changes.length === 0) {
    return <span className="text-muted-foreground">{t("noChanges")}</span>;
  }

  return (
    <dl className="flex flex-col gap-1 text-sm">
      {changes.map((change) => (
        <div key={change.key} className="flex flex-wrap items-baseline gap-x-2">
          <dt className="text-muted-foreground">{labelOf(change.key)}</dt>
          <dd className="flex flex-wrap items-baseline gap-x-1.5">
            <Value value={change.before} />
            <ArrowRightIcon aria-hidden className="size-3 self-center text-muted-foreground rtl:rotate-180" />
            <Value value={change.after} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
