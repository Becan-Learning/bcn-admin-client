"use client";

import { useTranslations } from "next-intl";
import { SearchBox } from "@/components/shell/search-box";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { hasActiveCourseFilters, type CoursesQueryState } from "@/lib/catalog/course-query-state";
import { COURSE_STATUSES, type AdminInstitution } from "@/lib/catalog/types";

// Radix Select cannot hold an empty string, so "no filter" is this value.
const ALL = "all";

export function CoursesToolbar({
  state,
  institutions,
  onChange,
  onClear,
}: {
  state: CoursesQueryState;
  institutions: AdminInstitution[];
  // `replace` for the search box (typing should not fill the history), a push for everything else.
  onChange: (next: CoursesQueryState, mode?: "push" | "replace") => void;
  onClear: () => void;
}) {
  const t = useTranslations("Catalog.courses");
  const statuses = useTranslations("Catalog.courseStatus");
  // An Institution in the URL that the list does not have (the list failed to load) still shows up.
  const unknownInstitution =
    state.institutionId && !institutions.some((item) => item.id === state.institutionId)
      ? state.institutionId
      : null;

  return (
    <div role="search" className="flex flex-wrap items-center gap-2">
      <SearchBox
        value={state.search}
        onCommit={(search) => onChange({ ...state, search }, "replace")}
        label={t("searchLabel")}
        placeholder={t("searchPlaceholder")}
        clearLabel={t("clearSearch")}
      />

      <Select
        value={state.status ?? ALL}
        onValueChange={(value) =>
          onChange({ ...state, status: COURSE_STATUSES.find((status) => status === value) })
        }
      >
        <SelectTrigger aria-label={t("statusLabel")} className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("allStatuses")}</SelectItem>
          {COURSE_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {statuses(status)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={state.institutionId ?? ALL}
        onValueChange={(value) =>
          onChange({ ...state, institutionId: value === ALL ? undefined : value })
        }
      >
        <SelectTrigger aria-label={t("institutionLabel")} className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("allInstitutions")}</SelectItem>
          {institutions.map((institution) => (
            <SelectItem key={institution.id} value={institution.id}>
              {institution.name.en}
            </SelectItem>
          ))}
          {unknownInstitution ? (
            <SelectItem value={unknownInstitution}>{unknownInstitution}</SelectItem>
          ) : null}
        </SelectContent>
      </Select>

      {hasActiveCourseFilters(state) ? (
        <Button variant="ghost" size="sm" onClick={onClear}>
          {t("clearFilters")}
        </Button>
      ) : null}
    </div>
  );
}
