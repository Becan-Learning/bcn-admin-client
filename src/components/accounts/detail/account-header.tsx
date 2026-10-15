import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import type { AccountProfile } from "@/lib/accounts/fetch-account";

// The name and the facts an Admin wants at a glance. A Server Component: no state.
export async function AccountHeader({ account }: { account: AccountProfile }) {
  const t = await getTranslations("AccountDetail.header");
  const role =
    account.role === "admin" ? t("roleAdmin") : account.role === "user" || !account.role ? t("roleStudent") : account.role;

  return (
    <header className="flex flex-col gap-2">
      <h1 dir="auto" className="text-2xl font-semibold tracking-tight">
        {account.name}
      </h1>
      <p dir="auto" className="text-sm text-muted-foreground">
        {account.email}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={account.role === "admin" ? "default" : "secondary"}>{role}</Badge>
        {account.banned ? <Badge variant="destructive">{t("banned")}</Badge> : null}
        <Badge variant="outline">{account.twoFactorEnabled ? t("twoFactorOn") : t("twoFactorOff")}</Badge>
      </div>
    </header>
  );
}
