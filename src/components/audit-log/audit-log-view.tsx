"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertCircleIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  PAGE_SIZE,
  hasActiveFilters,
  pageCount,
  parseAuditFilters,
  toPageParams,
  type AuditFilters,
} from "@/lib/audit-log/filters";
import type { AuditPage } from "@/lib/audit-log/api";
import { AuditLogFilters } from "./audit-log-filters";
import { AuditLogTable, AuditLogTableSkeleton } from "./audit-log-table";
import { useAdminActors } from "./use-admin-actors";
import { useAuditLog } from "./use-audit-log";

// All filter and page state lives in the URL's search params, so a view can be shared and the back
// button works.
export function AuditLogView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseAuditFilters(searchParams);
  const actors = useAdminActors();
  const { result, retry } = useAuditLog(filters);

  function go(next: AuditFilters) {
    const query = toPageParams(next).toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex flex-col gap-6">
      <AuditLogFilters
        key={toPageParams({ ...filters, page: 1 }).toString()}
        filters={filters}
        actors={actors}
        onApply={(draft) => go({ ...draft, page: 1 })}
      />
      <Results filters={filters} result={result} retry={retry} go={go} />
    </div>
  );
}

function Results({
  filters,
  result,
  retry,
  go,
}: {
  filters: AuditFilters;
  result: ReturnType<typeof useAuditLog>["result"];
  retry: () => void;
  go: (filters: AuditFilters) => void;
}) {
  const t = useTranslations("AuditLog");
  const errors = useTranslations("Errors");
  const common = useTranslations("Common");

  if (!result) return <AuditLogTableSkeleton />;

  if (!result.ok) {
    return (
      <Alert variant="destructive" role="alert">
        <AlertCircleIcon />
        <AlertTitle>{t("loadFailed")}</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-3">
          {errors(result.errorKey)}
          <Button variant="outline" size="sm" onClick={retry}>
            {common("tryAgain")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const { page } = result;
  if (page.entries.length === 0) {
    return <EmptyState page={page} filters={filters} go={go} />;
  }

  const pages = pageCount(page.total);
  const first = page.offset + 1;
  const last = page.offset + page.entries.length;
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border">
        <AuditLogTable entries={page.entries} />
      </div>
      <nav
        aria-label={t("pagination")}
        className="flex flex-wrap items-center justify-between gap-3 text-sm"
      >
        <p className="text-muted-foreground">
          {t("summary", { from: first, to: last, total: page.total })}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            {t("page", { page: filters.page, pages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={filters.page <= 1}
            onClick={() => go({ ...filters, page: filters.page - 1 })}
          >
            <ChevronLeftIcon data-icon="inline-start" />
            {t("previous")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={filters.page >= pages}
            onClick={() => go({ ...filters, page: filters.page + 1 })}
          >
            {t("next")}
            <ChevronRightIcon data-icon="inline-end" />
          </Button>
        </div>
      </nav>
    </div>
  );
}

function EmptyState({
  page,
  filters,
  go,
}: {
  page: AuditPage;
  filters: AuditFilters;
  go: (filters: AuditFilters) => void;
}) {
  const t = useTranslations("AuditLog");
  // Entries exist, but not on this page: the URL asked for a page past the end.
  const pastTheEnd = page.total > 0 && page.offset >= PAGE_SIZE;
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center"
    >
      <p className="font-medium">{t("empty.title")}</p>
      <p className="text-sm text-muted-foreground">
        {pastTheEnd
          ? t("pageBeyond")
          : hasActiveFilters(filters)
            ? t("empty.filtered")
            : t("empty.none")}
      </p>
      {pastTheEnd ? (
        <Button variant="outline" size="sm" onClick={() => go({ ...filters, page: 1 })}>
          {t("firstPage")}
        </Button>
      ) : null}
    </div>
  );
}
