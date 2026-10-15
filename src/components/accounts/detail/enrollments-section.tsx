import { Suspense } from "react";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { fetchCatalogCourses, fetchEnrollments } from "@/lib/accounts/fetch-detail";
import type { AccountProfile } from "@/lib/accounts/fetch-account";
import { EnrollmentsCard } from "./enrollments-card";
import { SectionError, SectionSkeleton } from "./section-states";

// Enrollments: active and ended, with End and Grant. Loads its own data inside its own <Suspense>
// (the backend's GET /enrollments with the forwarded cookie, plus the public Catalog for the Course
// picker), so a failure here leaves the other sections alone.
export async function EnrollmentsSection({ account }: { account: AccountProfile }) {
  const t = await getTranslations("AccountDetail.enrollments");
  return (
    <Suspense fallback={<SectionSkeleton label={t("loading")} />}>
      <EnrollmentsData accountId={account.id} />
    </Suspense>
  );
}

async function EnrollmentsData({ accountId }: { accountId: string }) {
  const [t, errors, incoming] = await Promise.all([
    getTranslations("AccountDetail.enrollments"),
    getTranslations("Errors"),
    headers(),
  ]);
  const [enrollments, catalog] = await Promise.all([
    fetchEnrollments(accountId, incoming),
    fetchCatalogCourses(),
  ]);

  if (!enrollments.ok) {
    return <SectionError title={t("loadFailed")} message={errors(enrollments.errorKey)} />;
  }
  return (
    <EnrollmentsCard
      accountId={accountId}
      enrollments={enrollments.data}
      catalog={catalog.ok ? catalog.data : null}
    />
  );
}
