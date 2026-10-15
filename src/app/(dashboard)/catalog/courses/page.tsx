import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/shell/placeholder-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Pages.catalogCourses");
  return { title: t("title") };
}

// AD2 (#23) replaces this with the Courses list.
export default function Page() {
  return <PlaceholderPage page="catalogCourses" />;
}
