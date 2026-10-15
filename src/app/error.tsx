"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("Common");
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">{t("somethingWentWrong")}</h1>
      <Button onClick={reset}>{t("tryAgain")}</Button>
    </main>
  );
}
