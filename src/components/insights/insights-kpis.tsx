import { useTranslations } from "next-intl";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCount, splitDuration } from "@/lib/insights/format";
import type { InsightsRange } from "@/lib/insights/range";
import type { Insights } from "@/lib/insights/types";

// Five totals. Students is all time; the other four are for the selected range.
export function InsightsKpis({ totals, range }: { totals: Insights["totals"]; range: InsightsRange }) {
  const t = useTranslations("Insights");
  const phrase = t(`rangePhrases.${range}`);
  const study = splitDuration(totals.studySeconds);

  const items = [
    { key: "students", value: formatCount(totals.students), hint: t("kpi.studentsHint") },
    { key: "signups", value: formatCount(totals.signups), hint: phrase },
    { key: "activeStudents", value: formatCount(totals.activeStudents), hint: phrase },
    { key: "heldSessions", value: formatCount(totals.heldSessions), hint: phrase },
    { key: "studyTime", value: t("duration", study), hint: phrase },
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {items.map((item) => (
        <Card key={item.key} size="sm">
          <CardHeader>
            <CardDescription>{t(`kpi.${item.key}`)}</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{item.value}</CardTitle>
            <CardDescription>{item.hint}</CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
