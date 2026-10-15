import { Suspense } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { InstitutionsSkeleton } from "@/components/catalog/institutions-skeleton";
import { InstitutionsView } from "@/components/catalog/institutions-view";
import { PageHeader } from "@/components/shell/page-header";
import { fetchInstitutionsWithMajors } from "@/lib/catalog/fetch";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Pages.catalogInstitutions");
  return { title: t("title") };
}

export default async function Page() {
  const t = await getTranslations("Pages.catalogInstitutions");
  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      <Suspense fallback={<InstitutionsSkeleton />}>
        <Institutions />
      </Suspense>
    </div>
  );
}

// Fetches on the server with the visitor's cookie forwarded, inside this Suspense boundary (the same
// pattern as the Accounts list). The client view draws the result and runs the writes.
async function Institutions() {
  const result = await fetchInstitutionsWithMajors(await headers());
  return <InstitutionsView result={result} />;
}
