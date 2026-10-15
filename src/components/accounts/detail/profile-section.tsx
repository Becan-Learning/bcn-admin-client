import { getTranslations } from "next-intl/server";
import type { AccountProfile } from "@/lib/accounts/fetch-account";
import type { Institution } from "@/lib/accounts/types";
import { EmailCard } from "./email-card";
import { PasswordResetCard } from "./password-reset-card";
import { ProfileDetailsCard } from "./profile-details-card";

// The Profile section: details, email, and the password-reset email. Server Component that hands
// plain values to the client cards.
export async function ProfileSection({
  account,
  institutions,
}: {
  account: AccountProfile;
  institutions: Institution[];
}) {
  const t = await getTranslations("AccountDetail.profile");
  return (
    <section aria-label={t("title")} className="flex flex-col gap-6">
      <ProfileDetailsCard
        accountId={account.id}
        initial={{
          name: account.name,
          phoneNumber: account.phoneNumber,
          institutionId: account.institutionId,
          majorId: account.majorId,
        }}
        institutions={institutions}
      />
      <EmailCard accountId={account.id} email={account.email} emailVerified={account.emailVerified} />
      <PasswordResetCard accountId={account.id} email={account.email} />
    </section>
  );
}
