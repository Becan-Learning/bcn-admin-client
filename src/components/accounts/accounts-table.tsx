"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  columnVisibilityFeature,
  createColumnHelper,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type PaginationState,
  type SortingState,
  type Updater,
} from "@tanstack/react-table";
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PAGE_SIZE,
  SORT_COLUMNS,
  type AccountSortColumn,
  type AccountsQueryState,
} from "@/lib/accounts/query-state";
import type { AdminAccount } from "@/lib/accounts/types";

// The table only displays what the backend already sorted and paged, so both are manual and no row
// models are registered. The URL holds the state; the table reads it and reports changes.
const features = tableFeatures({
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSortingFeature,
});
const columnHelper = createColumnHelper<typeof features, AdminAccount>();

// UTC on purpose: the server and the browser then render the same text, and an Admin comparing two
// screens sees the same day.
const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });
const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

function isSortColumn(id: string): id is AccountSortColumn {
  return SORT_COLUMNS.some((column) => column === id);
}

// English first; the Arabic name sits beneath it, so neither is hidden.
function Localized({ name }: { name: { ar: string; en: string } }) {
  return (
    <div className="flex flex-col">
      <span>{name.en}</span>
      <span lang="ar" className="text-xs text-muted-foreground">
        <bdi>{name.ar}</bdi>
      </span>
    </div>
  );
}

export function AccountsTable({
  accounts,
  total,
  state,
  onSort,
  onPage,
}: {
  accounts: AdminAccount[];
  total: number;
  state: AccountsQueryState;
  onSort: (column: AccountSortColumn) => void;
  onPage: (page: number) => void;
}) {
  const t = useTranslations("Accounts");
  const router = useRouter();

  const columns = useMemo(() => {
    function sortHeader(id: AccountSortColumn, label: string) {
      const active = state.sortBy === id;
      const Icon = !active ? ArrowUpDownIcon : state.sortDirection === "asc" ? ArrowUpIcon : ArrowDownIcon;
      return (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2.5"
          aria-label={t("sortBy", { column: label })}
          onClick={() => onSort(id)}
        >
          {label}
          <Icon aria-hidden className={active ? undefined : "text-muted-foreground"} />
        </Button>
      );
    }

    return columnHelper.columns([
      columnHelper.accessor("name", {
        header: () => sortHeader("name", t("columns.name")),
        cell: ({ row }) => (
          <Link
            href={`/accounts/${row.original.id}`}
            dir="auto"
            className="font-medium hover:underline focus-visible:underline focus-visible:outline-none"
          >
            {row.original.name}
          </Link>
        ),
      }),
      columnHelper.accessor("email", {
        header: () => sortHeader("email", t("columns.email")),
        cell: ({ row }) => <span dir="auto">{row.original.email}</span>,
      }),
      columnHelper.accessor("phoneNumber", {
        header: t("columns.phone"),
        enableSorting: false,
        cell: ({ row }) => (
          <span dir="auto" className="whitespace-nowrap">
            {row.original.phoneNumber}
          </span>
        ),
      }),
      columnHelper.accessor((account) => account.institution.name.en, {
        id: "institution",
        header: t("columns.institution"),
        enableSorting: false,
        cell: ({ row }) => <Localized name={row.original.institution.name} />,
      }),
      columnHelper.accessor((account) => account.major.name.en, {
        id: "major",
        header: t("columns.major"),
        enableSorting: false,
        cell: ({ row }) => <Localized name={row.original.major.name} />,
      }),
      columnHelper.accessor("role", {
        header: t("columns.role"),
        enableSorting: false,
        cell: ({ row }) =>
          row.original.role === "admin" ? (
            <Badge>{t("roleAdmin")}</Badge>
          ) : (
            <Badge variant="outline">{t("roleStudent")}</Badge>
          ),
      }),
      columnHelper.accessor("emailVerified", {
        header: t("columns.emailVerified"),
        enableSorting: false,
        cell: ({ row }) =>
          row.original.emailVerified ? (
            <Badge variant="secondary">{t("verified")}</Badge>
          ) : (
            <Badge variant="outline">{t("unverified")}</Badge>
          ),
      }),
      columnHelper.accessor("twoFactorEnabled", {
        header: t("columns.twoFactor"),
        enableSorting: false,
        cell: ({ row }) =>
          row.original.twoFactorEnabled ? (
            <Badge variant="secondary">{t("twoFactorOn")}</Badge>
          ) : (
            <span className="text-muted-foreground">{t("twoFactorOff")}</span>
          ),
      }),
      columnHelper.accessor("banned", {
        header: t("columns.banned"),
        enableSorting: false,
        cell: ({ row }) => {
          const { banned, banExpires } = row.original;
          if (!banned) return <span className="text-muted-foreground">{t("notBanned")}</span>;
          return (
            <Badge
              variant="destructive"
              title={
                banExpires
                  ? t("bannedUntil", { date: dateTimeFormat.format(new Date(banExpires)) })
                  : undefined
              }
            >
              {t("banned")}
            </Badge>
          );
        },
      }),
      columnHelper.accessor("createdAt", {
        header: () => sortHeader("createdAt", t("columns.created")),
        cell: ({ row }) => {
          const created = new Date(row.original.createdAt);
          return (
            <span className="whitespace-nowrap" title={dateTimeFormat.format(created) + " UTC"}>
              {dateFormat.format(created)}
            </span>
          );
        },
      }),
    ]);
  }, [t, state.sortBy, state.sortDirection, onSort]);

  const sorting: SortingState = [{ id: state.sortBy, desc: state.sortDirection === "desc" }];
  const pagination: PaginationState = { pageIndex: state.page - 1, pageSize: PAGE_SIZE };

  const table = useTable({
    features,
    data: accounts,
    columns,
    getRowId: (account) => account.id,
    manualSorting: true,
    manualPagination: true,
    rowCount: total,
    state: { sorting, pagination },
    onPaginationChange: (updater: Updater<PaginationState>) => {
      const next = typeof updater === "function" ? updater(pagination) : updater;
      onPage(next.pageIndex + 1);
    },
  });

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sorted = isSortColumn(header.column.id) && state.sortBy === header.column.id;
                  return (
                    <TableHead
                      key={header.id}
                      aria-sort={
                        sorted ? (state.sortDirection === "asc" ? "ascending" : "descending") : undefined
                      }
                    >
                      {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={(event) => {
                  // The name is a real link (keyboard, middle click); the rest of the row is a
                  // larger target for the same destination.
                  if ((event.target as HTMLElement).closest("a, button")) return;
                  router.push(`/accounts/${row.original.id}`);
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>{t("summary", { total })}</span>
        <div className="flex items-center gap-2">
          <span>{t("pageOf", { page: state.page, pages: pageCount })}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            {t("previous")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            {t("next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
