"use client";

import { useTranslations } from "next-intl";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { RANGES, type InsightsRange } from "@/lib/insights/range";

export function RangeControl({
  value,
  onChange,
}: {
  value: InsightsRange;
  onChange: (range: InsightsRange) => void;
}) {
  const t = useTranslations("Insights");
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      spacing={0}
      value={value}
      aria-label={t("rangeLabel")}
      // A single toggle group reports "" when the active item is pressed again: keep the range.
      onValueChange={(next) => {
        const range = RANGES.find((candidate) => candidate === next);
        if (range) onChange(range);
      }}
    >
      {RANGES.map((range) => (
        <ToggleGroupItem key={range} value={range} className="px-4">
          {t(`ranges.${range}`)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
