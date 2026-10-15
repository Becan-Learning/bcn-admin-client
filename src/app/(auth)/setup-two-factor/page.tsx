import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SetupTwoFactorForm } from "@/components/auth/setup-two-factor-form";
import { requireGate } from "@/lib/auth/guard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Setup");
  return { title: t("title") };
}

export default function SetupTwoFactorPage() {
  return (
    <Suspense>
      <SetupTwoFactor />
    </Suspense>
  );
}

// Only an Admin without two-factor belongs here; anyone else goes to their own page.
async function SetupTwoFactor() {
  await requireGate("setup-two-factor");
  return <SetupTwoFactorForm />;
}
