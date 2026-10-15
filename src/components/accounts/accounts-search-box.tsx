"use client";

import { useTranslations } from "next-intl";
import { SearchBox } from "@/components/shell/search-box";

// The Accounts list's search field: the shared SearchBox with the Accounts texts.
export function AccountsSearchBox({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (search: string) => void;
}) {
  const t = useTranslations("Accounts");
  return (
    <SearchBox
      value={value}
      onCommit={onCommit}
      label={t("searchLabel")}
      placeholder={t("searchPlaceholder")}
      clearLabel={t("clearSearch")}
    />
  );
}
