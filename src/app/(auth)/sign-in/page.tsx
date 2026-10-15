import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { SignInForm } from "@/components/auth/sign-in-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("SignIn");
  return { title: t("title") };
}

// No sign-up here: Admins are Accounts that an Admin promoted.
export default async function SignInPage() {
  const t = await getTranslations("SignIn");
  return (
    <AuthCard title={t("title")} description={t("description")}>
      <SignInForm />
    </AuthCard>
  );
}
