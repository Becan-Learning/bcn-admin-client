import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";

export default function ChapterNotFound() {
  const t = useTranslations("ChapterDetail");
  return (
    <div className="flex max-w-5xl flex-col gap-4">
      <Link href="/catalog/courses" className="w-fit text-sm text-muted-foreground hover:text-foreground">
        {t("backToCourses")}
      </Link>
      <Card>
        <CardContent className="flex flex-col gap-1">
          <p className="font-medium">{t("notFoundTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("notFoundDescription")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
