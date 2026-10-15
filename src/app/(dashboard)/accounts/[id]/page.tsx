import { Suspense } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AlertCircleIcon, ArrowLeftIcon } from "lucide-react";
import { AccountActionsSection } from "@/components/accounts/detail/actions-section";
import { AccountHeader } from "@/components/accounts/detail/account-header";
import { EnrollmentsSection } from "@/components/accounts/detail/enrollments-section";
import { PlanUsageSection } from "@/components/accounts/detail/plan-usage-section";
import { ProfileSection } from "@/components/accounts/detail/profile-section";
import { SessionsSection } from "@/components/accounts/detail/sessions-section";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchInstitutions } from "@/lib/accounts/fetch";
import { fetchAccountProfile } from "@/lib/accounts/fetch-account";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AccountDetail");
  return { title: t("title") };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("AccountDetail");
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link
        href="/accounts"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon aria-hidden className="size-4" />
        {t("backToList")}
      </Link>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <Detail params={params} />
      </Suspense>
    </div>
  );
}

// Reads the cookie, so it sits inside <Suspense>. The header comes first, then one component per
// section. Each section lives in its own file under components/accounts/detail/, so a later issue
// only edits its own file: Actions (#5) and Enrollments, Plan and Usage and Sessions (#6) are empty
// slots until then.
async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, t, errors, incoming] = await Promise.all([
    params,
    getTranslations("AccountDetail"),
    getTranslations("Errors"),
    headers(),
  ]);
  const [result, institutions] = await Promise.all([
    fetchAccountProfile(id, incoming),
    fetchInstitutions(),
  ]);

  if (!result.ok && (result.errorKey === "USER_NOT_FOUND" || result.errorKey === "ACCOUNT_NOT_FOUND")) {
    notFound();
  }

  if (!result.ok) {
    return (
      <Alert variant="destructive" role="alert">
        <AlertCircleIcon />
        <AlertTitle>{t("errorTitle")}</AlertTitle>
        <AlertDescription>{errors(result.errorKey)}</AlertDescription>
      </Alert>
    );
  }

  const { account } = result;
  return (
    <>
      <AccountHeader account={account} />
      <ProfileSection account={account} institutions={institutions} />
      <AccountActionsSection account={account} />
      <EnrollmentsSection account={account} />
      <PlanUsageSection account={account} />
      <SessionsSection account={account} />
    </>
  );
}
