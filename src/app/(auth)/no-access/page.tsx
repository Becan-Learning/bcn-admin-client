import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireGate } from "@/lib/auth/guard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("NoAccess");
  return { title: t("title") };
}

export default function NoAccessPage() {
  return (
    <Suspense>
      <NoAccess />
    </Suspense>
  );
}

async function NoAccess() {
  const session = await requireGate("no-access");
  const t = await getTranslations("NoAccess");
  return (
    <AuthCard title={t("title")}>
      <p className="text-sm text-muted-foreground">
        {t.rich("description", {
          email: session.user.email,
          account: (chunks) => (
            <bdi className="font-medium text-foreground" dir="auto">
              {chunks}
            </bdi>
          ),
        })}
      </p>
      <p className="text-sm text-muted-foreground">{t("hint")}</p>
      <SignOutButton />
    </AuthCard>
  );
}
