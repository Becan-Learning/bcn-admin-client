import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "./page-header";

type PlaceholderKey = "accounts" | "catalog";

// A dashboard page that exists for navigation but has no content yet.
export async function PlaceholderPage({ page }: { page: PlaceholderKey }) {
  const t = await getTranslations(`Pages.${page}`);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      <Card>
        <CardContent className="text-sm text-muted-foreground">{t("placeholder")}</CardContent>
      </Card>
    </div>
  );
}
