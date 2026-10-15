import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DeviceSessionsCard } from "@/components/account/device-sessions-card";
import { ProfileCard } from "@/components/account/profile-card";
import { TwoFactorCard } from "@/components/account/two-factor-card";
import { PageHeader } from "@/components/shell/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { requireGate } from "@/lib/auth/guard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Pages.myAccount");
  return { title: t("title") };
}

export default async function Page() {
  const t = await getTranslations("Pages.myAccount");
  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <Sections />
      </Suspense>
    </div>
  );
}

// Reads the session (cookies), so it sits inside Suspense.
async function Sections() {
  const session = await requireGate("ok");
  return (
    <>
      <ProfileCard name={session.user.name} email={session.user.email} />
      <TwoFactorCard enabled={session.user.twoFactorEnabled === true} />
      <DeviceSessionsCard currentSessionId={session.session.id} />
    </>
  );
}
