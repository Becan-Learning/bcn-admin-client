import { getTranslations } from "next-intl/server";
import { AlertCircleIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { AccountProfile } from "@/lib/accounts/fetch-account";
import { roleHasPermission } from "@/lib/auth/gate";
import { getSession } from "@/lib/auth/session";
import { AccountDeviceSessionsCard } from "./account-device-sessions-card";
import { BanCard } from "./ban-card";
import { RemoveAccountCard } from "./remove-account-card";
import { RoleCard } from "./role-card";

// The Actions section: ban, Device sessions, Role and removal. A Server Component that learns who is
// looking (to disable the actions an Admin must not aim at themselves) and hands plain values to the
// client cards. The backend refuses those self-targeted calls too (ADMIN_SELF_TARGET).
export async function AccountActionsSection({ account }: { account: AccountProfile }) {
  const [t, session] = await Promise.all([getTranslations("AccountDetail.actions"), getSession()]);
  const isSelf = session?.user.id === account.id;
  const isAdmin = roleHasPermission(account.role, { user: ["list"] });

  return (
    <section aria-label={t("title")} className="flex flex-col gap-6">
      {isSelf ? (
        <Alert>
          <AlertCircleIcon />
          <AlertDescription>{t("selfNote")}</AlertDescription>
        </Alert>
      ) : null}
      <BanCard
        accountId={account.id}
        isSelf={isSelf}
        banned={account.banned === true}
        banReason={account.banReason ?? null}
        banExpires={account.banExpires ?? null}
      />
      <AccountDeviceSessionsCard
        accountId={account.id}
        isSelf={isSelf}
        currentSessionId={session?.session.id ?? ""}
        reloadKey={String(account.banned === true)}
      />
      <RoleCard accountId={account.id} isSelf={isSelf} isAdmin={isAdmin} />
      <RemoveAccountCard accountId={account.id} email={account.email} isSelf={isSelf} />
    </section>
  );
}
