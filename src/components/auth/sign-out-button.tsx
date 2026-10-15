"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogOutIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

export function useSignOut() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    try {
      await authClient.signOut();
    } finally {
      // Even if the call failed, leave: the dashboard re-checks the session on the next load.
      router.replace("/sign-in");
      router.refresh();
    }
  }

  return { signOut, pending };
}

export function SignOutButton({ variant = "outline" }: { variant?: "outline" | "default" | "ghost" }) {
  const t = useTranslations("Common");
  const { signOut, pending } = useSignOut();
  return (
    <Button variant={variant} onClick={signOut} disabled={pending}>
      <LogOutIcon data-icon="inline-start" />
      {pending ? t("signingOut") : t("signOut")}
    </Button>
  );
}
