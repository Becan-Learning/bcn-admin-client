import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";

export default function AccountNotFound() {
  const t = useTranslations("AccountDetail");
  return (
    <div className="flex flex-col gap-4">
      <Link href="/accounts" className="w-fit text-sm text-muted-foreground hover:text-foreground">
        {t("backToList")}
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
