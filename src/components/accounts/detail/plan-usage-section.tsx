import { Suspense } from "react";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateUtc } from "@/lib/accounts/format";
import { fetchAccountAllowance } from "@/lib/accounts/fetch-detail";
import type { AccountProfile } from "@/lib/accounts/fetch-account";
import { minutesLimit, usageMeters, type Meter } from "@/lib/accounts/usage";
import { SectionError, SectionSkeleton } from "./section-states";

// Plan, current Period and Usage. The backend computes them exactly as for the Student's own
// /me/allowance; this section only draws them. Loads inside its own <Suspense> with the forwarded
// cookie.
export async function PlanUsageSection({ account }: { account: AccountProfile }) {
  const t = await getTranslations("AccountDetail.planUsage");
  return (
    <Suspense fallback={<SectionSkeleton label={t("loading")} />}>
      <PlanUsageData accountId={account.id} />
    </Suspense>
  );
}

async function PlanUsageData({ accountId }: { accountId: string }) {
  const [t, errors, incoming] = await Promise.all([
    getTranslations("AccountDetail.planUsage"),
    getTranslations("Errors"),
    headers(),
  ]);
  const result = await fetchAccountAllowance(accountId, incoming);
  if (!result.ok) return <SectionError title={t("loadFailed")} message={errors(result.errorKey)} />;

  const allowance = result.data;
  const meters = usageMeters(allowance);
  const minutes = (seconds: number | null) => {
    const value = minutesLimit(seconds);
    return value === null ? t("noLimit") : t("minutesValue", { minutes: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">{t("plan")}</dt>
            <dd className="flex flex-wrap items-center gap-2 font-medium">
              <span dir="auto">{allowance.plan.name.en}</span>
              {allowance.unlimited ? <Badge>{t("unlimitedAdmin")}</Badge> : null}
            </dd>
            <dd dir="auto" lang="ar" className="text-xs text-muted-foreground">
              {allowance.plan.name.ar}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">{t("period")}</dt>
            <dd className="font-medium">
              {t("periodRange", {
                start: formatDateUtc(allowance.period.start),
                end: formatDateUtc(allowance.period.end),
              })}
            </dd>
          </div>
        </dl>

        {allowance.unlimited ? (
          <p className="text-sm text-muted-foreground">{t("unlimitedAdminNote")}</p>
        ) : null}

        <div className="grid gap-5">
          <MeterRow name={t("sessions")} meter={meters.sessions} />
          <MeterRow name={t("minutes")} meter={meters.minutes} />
          <MeterRow name={t("slots")} meter={meters.slots} />
        </div>

        <dl className="grid gap-4 border-t pt-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">{t("longestSession")}</dt>
            <dd className="font-medium">{minutes(allowance.limits.sessionSeconds)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">{t("minStart")}</dt>
            <dd className="font-medium">{minutes(allowance.limits.minStartSeconds)}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

async function MeterRow({ name, meter }: { name: string; meter: Meter }) {
  const t = await getTranslations("AccountDetail.planUsage");
  const text =
    meter.kind === "unlimited"
      ? `${t("usedOnly", { used: meter.used })} · ${t("unlimited")}`
      : t("usedOf", { used: meter.used, limit: meter.limit });
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{name}</span>
        <span className="text-muted-foreground">{text}</span>
      </div>
      {meter.kind === "limited" ? (
        <div
          role="progressbar"
          aria-label={t("meterLabel", { name, used: meter.used, limit: meter.limit })}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={meter.percent}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className={meter.percent >= 100 ? "h-full bg-destructive" : "h-full bg-primary"}
            style={{ width: `${meter.percent}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
