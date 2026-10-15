import { Suspense } from "react";
import { headers } from "next/headers";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ExternalLinkIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTimeUtc } from "@/lib/accounts/format";
import { fetchAccountSessions } from "@/lib/accounts/fetch-detail";
import type { AccountProfile } from "@/lib/accounts/fetch-account";
import type { RawSearchParams } from "@/lib/accounts/query-state";
import { langfuseSessionUrl } from "@/lib/accounts/langfuse";
import {
  pageCount,
  parseSessionsPage,
  SESSIONS_PAGE_PARAM,
  SESSIONS_PAGE_SIZE,
  sessionsPageHref,
} from "@/lib/accounts/sessions-page";
import { formatDuration } from "@/lib/accounts/usage";
import { CourseName } from "./course-name";
import { SectionError, SectionSkeleton } from "./section-states";

// Sessions: server-paged, ten a page, the page kept in the `sessionsPage` search param. Loads inside
// its own <Suspense> with the forwarded cookie. `searchParams` is optional so the section also
// renders where the page does not pass it (page one).
export async function SessionsSection({
  account,
  searchParams,
}: {
  account: AccountProfile;
  searchParams?: Promise<RawSearchParams>;
}) {
  const t = await getTranslations("AccountDetail.sessions");
  return (
    <Suspense fallback={<SectionSkeleton label={t("loading")} />}>
      <SessionsData accountId={account.id} searchParams={searchParams} />
    </Suspense>
  );
}

async function SessionsData({
  accountId,
  searchParams,
}: {
  accountId: string;
  searchParams?: Promise<RawSearchParams>;
}) {
  const [t, errors, incoming, params] = await Promise.all([
    getTranslations("AccountDetail.sessions"),
    getTranslations("Errors"),
    headers(),
    searchParams ?? Promise.resolve<RawSearchParams>({}),
  ]);
  const page = parseSessionsPage(params[SESSIONS_PAGE_PARAM]);
  const result = await fetchAccountSessions(
    accountId,
    { limit: SESSIONS_PAGE_SIZE, offset: (page - 1) * SESSIONS_PAGE_SIZE },
    incoming,
  );
  if (!result.ok) return <SectionError title={t("loadFailed")} message={errors(result.errorKey)} />;

  const { sessions, total } = result.data;
  const pages = pageCount(total);
  const projectUrl = process.env.LANGFUSE_PROJECT_URL;
  const href = (target: number) => sessionsPageHref(`/accounts/${encodeURIComponent(accountId)}`, params, target);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {total === 0 ? (
          <div className="flex flex-col items-center gap-1 rounded-md border border-dashed px-6 py-8 text-center">
            <p className="font-medium">{t("emptyTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("emptyDescription")}</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed px-6 py-8 text-center">
            <p className="text-sm text-muted-foreground">{t("pastEnd")}</p>
            <Button asChild variant="outline" size="sm">
              <Link href={href(1)} scroll={false}>
                {t("firstPage")}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.issued")}</TableHead>
                  <TableHead>{t("columns.course")}</TableHead>
                  <TableHead>{t("columns.kind")}</TableHead>
                  <TableHead>{t("columns.state")}</TableHead>
                  <TableHead>{t("columns.time")}</TableHead>
                  <TableHead>{t("columns.endReason")}</TableHead>
                  <TableHead>{t("columns.trace")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => {
                  const trace = langfuseSessionUrl(projectUrl, session.room);
                  return (
                    <TableRow key={session.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTimeUtc(session.issuedAt)}
                      </TableCell>
                      <TableCell>
                        <CourseName code={session.course.code} name={session.course.name} />
                        <span className="text-xs text-muted-foreground">
                          {t("chapter", { number: session.chapterNumber })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={session.kind === "admin" ? "default" : "outline"}>
                          {t(`kinds.${session.kind}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>{t(`states.${session.state}`)}</TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {formatDuration(session.connectedSeconds)} / {formatDuration(session.grantedSeconds)}
                      </TableCell>
                      <TableCell>
                        {session.endReason ? t(`endReasons.${session.endReason}`) : t("noEndReason")}
                      </TableCell>
                      <TableCell>
                        {trace ? (
                          <a
                            href={trace}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={t("langfuseLabel", { room: session.room })}
                            className="inline-flex items-center gap-1 text-sm underline-offset-4 hover:underline"
                          >
                            {t("langfuse")}
                            <ExternalLinkIcon aria-hidden className="size-3" />
                          </a>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {total > 0 && sessions.length > 0 ? (
          <nav
            aria-label={t("pagination")}
            className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground"
          >
            <span>
              {t("summary", {
                from: (page - 1) * SESSIONS_PAGE_SIZE + 1,
                to: (page - 1) * SESSIONS_PAGE_SIZE + sessions.length,
                total,
              })}
            </span>
            <div className="flex items-center gap-2">
              <span>{t("page", { page, pages })}</span>
              {page > 1 ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={href(page - 1)} scroll={false}>
                    {t("previous")}
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  {t("previous")}
                </Button>
              )}
              {page < pages ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={href(page + 1)} scroll={false}>
                    {t("next")}
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  {t("next")}
                </Button>
              )}
            </div>
          </nav>
        ) : null}
      </CardContent>
    </Card>
  );
}
