"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  hasActiveFilters,
  ROLES,
  withFilterChange,
  type AccountsQueryState,
} from "@/lib/accounts/query-state";
import type { Institution } from "@/lib/accounts/types";
import { AccountsSearchBox } from "./accounts-search-box";

// Radix Select cannot hold an empty string, so "no filter" is this value.
const ALL = "all";

export function AccountsToolbar({
  state,
  institutions,
  onChange,
  onClear,
}: {
  state: AccountsQueryState;
  institutions: Institution[];
  // `replace` for the search box (typing should not fill the history), a push for everything else.
  onChange: (next: AccountsQueryState, mode?: "push" | "replace") => void;
  onClear: () => void;
}) {
  const t = useTranslations("Accounts");
  const majors = institutions.find((item) => item.id === state.institutionId)?.majors ?? [];

  return (
    <div role="search" className="flex flex-wrap items-center gap-2">
      <AccountsSearchBox
        value={state.search}
        onCommit={(search) => onChange(withFilterChange(state, { search }), "replace")}
      />

      <Select
        value={state.role ?? ALL}
        onValueChange={(value) =>
          onChange(
            withFilterChange(state, {
              role: ROLES.find((role) => role === value),
            }),
          )
        }
      >
        <SelectTrigger aria-label={t("roleLabel")} className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("allRoles")}</SelectItem>
          <SelectItem value="user">{t("roleStudent")}</SelectItem>
          <SelectItem value="admin">{t("roleAdmin")}</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={state.institutionId ?? ALL}
        onValueChange={(value) =>
          onChange(withFilterChange(state, { institutionId: value === ALL ? undefined : value }))
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
        </SelectContent>
      </Select>

      <Select
        value={state.majorId ?? ALL}
        disabled={!state.institutionId}
        onValueChange={(value) =>
          onChange(withFilterChange(state, { majorId: value === ALL ? undefined : value }))
        }
      >
        <SelectTrigger
          aria-label={t("majorLabel")}
          title={state.institutionId ? undefined : t("majorNeedsInstitution")}
          className="w-48"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("allMajors")}</SelectItem>
          {majors.map((major) => (
            <SelectItem key={major.id} value={major.id}>
              {major.name.en}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={state.banned === undefined ? ALL : String(state.banned)}
        onValueChange={(value) =>
          onChange(
            withFilterChange(state, {
              banned: value === ALL ? undefined : value === "true",
            }),
          )
        }
      >
        <SelectTrigger aria-label={t("banLabel")} className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("allBanStatuses")}</SelectItem>
          <SelectItem value="true">{t("onlyBanned")}</SelectItem>
          <SelectItem value="false">{t("onlyNotBanned")}</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters(state) ? (
        <Button variant="ghost" size="sm" onClick={onClear}>
          {t("clearFilters")}
        </Button>
      ) : null}
    </div>
  );
}
