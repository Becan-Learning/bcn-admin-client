import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/shell/placeholder-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Pages.myAccount");
  return { title: t("title") };
}

export default function Page() {
  return <PlaceholderPage page="myAccount" />;
}
