"use client";

import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertCircleIcon, SearchXIcon, UsersIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { AccountsResult } from "@/lib/accounts/fetch";
import {
  accountsHref,
  DEFAULT_STATE,
  hasActiveFilters,
  type AccountSortColumn,
  type AccountsQueryState,
} from "@/lib/accounts/query-state";
import type { Institution } from "@/lib/accounts/types";
import { AccountsTable } from "./accounts-table";
import { AccountsToolbar } from "./accounts-toolbar";

// The URL is the only table state. Every change here is a navigation to the same page with new search
// params; the server component above re-fetches. Wrapped in a transition, the old rows stay on screen
// (dimmed) until the new ones arrive, instead of flashing back to the skeleton.
export function AccountsView({
  state,
  institutions,
  result,
}: {
  state: AccountsQueryState;
  institutions: Institution[];
  result: AccountsResult;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const go = useCallback(
    (next: AccountsQueryState, mode: "push" | "replace" = "push") => {
      startTransition(() => router[mode](accountsHref(next), { scroll: false }));
    },
    [router],
  );

  const onSort = useCallback(
    (column: AccountSortColumn) => {
      const sameColumn = state.sortBy === column;
      // A new column starts in its natural order: newest first for dates, A to Z for text.
      const sortDirection = sameColumn
        ? state.sortDirection === "asc"
          ? "desc"
          : "asc"
        : column === "createdAt"
          ? "desc"
          : "asc";
      go({ ...state, sortBy: column, sortDirection, page: 1 });
    },
    [go, state],
  );

  return (
    <div className="flex flex-col gap-4">
      <AccountsToolbar
        state={state}
        institutions={institutions}
        onChange={go}
        onClear={() =>
          go({ ...DEFAULT_STATE, sortBy: state.sortBy, sortDirection: state.sortDirection })
        }
      />

      <div aria-busy={pending} className={pending ? "opacity-60 transition-opacity" : undefined}>
        {!result.ok ? (
          <ErrorPanel errorKey={result.errorKey} onRetry={() => startTransition(() => router.refresh())} />
        ) : result.data.accounts.length === 0 ? (
          <EmptyPanel
            kind={result.data.total > 0 ? "pastEnd" : hasActiveFilters(state) ? "noMatches" : "empty"}
            onFirstPage={() => go({ ...state, page: 1 })}
            onClear={() => go({ ...DEFAULT_STATE, sortBy: state.sortBy, sortDirection: state.sortDirection })}
          />
        ) : (
          <AccountsTable
            accounts={result.data.accounts}
            total={result.data.total}
            state={state}
            onSort={onSort}
            onPage={(page) => go({ ...state, page })}
          />
        )}
      </div>
    </div>
  );
}

function ErrorPanel({
  errorKey,
  onRetry,
}: {
  errorKey: Extract<AccountsResult, { ok: false }>["errorKey"];
  onRetry: () => void;
}) {
  const t = useTranslations("Accounts");
  const errors = useTranslations("Errors");
  const common = useTranslations("Common");
  return (
    <Alert variant="destructive" role="alert">
      <AlertCircleIcon />
      <AlertTitle>{t("errorTitle")}</AlertTitle>
      <AlertDescription>
        <p>{errors(errorKey)}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          {common("tryAgain")}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function EmptyPanel({
  kind,
  onFirstPage,
  onClear,
}: {
  kind: "empty" | "noMatches" | "pastEnd";
  onFirstPage: () => void;
  onClear: () => void;
}) {
  const t = useTranslations("Accounts");
  const Icon = kind === "empty" ? UsersIcon : SearchXIcon;
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed px-6 py-12 text-center">
      <Icon aria-hidden className="size-8 text-muted-foreground" />
      <p className="font-medium">{t(`${kind}Title`)}</p>
      <p className="text-sm text-muted-foreground">{t(`${kind}Description`)}</p>
      {kind === "noMatches" ? (
        <Button variant="outline" size="sm" onClick={onClear}>
          {t("clearFilters")}
        </Button>
      ) : null}
      {kind === "pastEnd" ? (
        <Button variant="outline" size="sm" onClick={onFirstPage}>
          {t("firstPage")}
        </Button>
      ) : null}
    </div>
  );
}
