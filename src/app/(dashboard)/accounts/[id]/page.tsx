import { Suspense } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AlertCircleIcon, ArrowLeftIcon } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAccountSummary } from "@/lib/accounts/fetch-account";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AccountDetail");
  return { title: t("title") };
}

// A placeholder: the Account's name and a note. The profile, Enrollments, Plan and Usage and
// Sessions sections arrive with the next issue.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("AccountDetail");
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/accounts"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon aria-hidden className="size-4" />
        {t("backToList")}
      </Link>
      <Suspense fallback={<Skeleton className="h-24 w-full" />}>
        <Detail params={params} />
      </Suspense>
    </div>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, t, errors] = await Promise.all([
    params,
    getTranslations("AccountDetail"),
    getTranslations("Errors"),
  ]);
  const result = await fetchAccountSummary(id, await headers());

  if (!result.ok && result.errorKey === "USER_NOT_FOUND") notFound();

  if (!result.ok) {
    return (
      <Alert variant="destructive" role="alert">
        <AlertCircleIcon />
        <AlertTitle>{t("errorTitle")}</AlertTitle>
        <AlertDescription>{errors(result.errorKey)}</AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <div dir="auto" className="contents">
        <PageHeader title={result.account.name} description={result.account.email} />
      </div>
      <Card>
        <CardContent className="flex flex-col gap-1">
          <p className="font-medium">{t("comingSoon")}</p>
          <p className="text-sm text-muted-foreground">{t("comingSoonDescription")}</p>
        </CardContent>
      </Card>
    </>
  );
}
