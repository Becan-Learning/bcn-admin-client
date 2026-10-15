import { Suspense } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { AccountsSkeleton } from "@/components/accounts/accounts-skeleton";
import { AccountsView } from "@/components/accounts/accounts-view";
import { PageHeader } from "@/components/shell/page-header";
import { fetchAccounts, fetchInstitutions } from "@/lib/accounts/fetch";
import { parseAccountsSearchParams, type RawSearchParams } from "@/lib/accounts/query-state";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Pages.accounts");
  return { title: t("title") };
}

export default async function Page({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const t = await getTranslations("Pages.accounts");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      <Suspense fallback={<AccountsSkeleton />}>
        <Accounts searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

// How the page fetches: on the server, with the visitor's cookie forwarded to the backend, inside
// this Suspense boundary. Under Cache Components, `searchParams` and `headers()` are request-time
// reads, so they have to sit in a boundary anyway, and the boundary then gives the loading skeleton
// for free. Because the table state is the URL, a change of filter, sort or page is just a navigation
// that re-runs this component: there is no client fetching code, no loading flags to keep in step
// with the URL, and the browser never needs the cookie in a script. The client component only draws
// the result and navigates.
async function Accounts({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const state = parseAccountsSearchParams(await searchParams);
  const incoming = await headers();
  const [result, institutions] = await Promise.all([
    fetchAccounts(state, incoming),
    fetchInstitutions(),
  ]);
  return <AccountsView state={state} institutions={institutions} result={result} />;
}
