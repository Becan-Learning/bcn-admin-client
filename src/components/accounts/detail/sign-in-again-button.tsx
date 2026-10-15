"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import { signInUrl } from "@/lib/auth/return-path";

// For FRESH_SESSION_REQUIRED: Role changes and removals need a Device session created in the last ten
// minutes. Signs out, then goes to /sign-in with this Account as the page to return to (the sign-in and
// two-factor forms follow `next`).
export function SignInAgainButton({ accountId }: { accountId: string }) {
  const t = useTranslations("AccountDetail.actions");
  const [pending, setPending] = useState(false);

  async function signInAgain() {
    setPending(true);
    try {
      await authClient.signOut();
    } catch {
      // Leave anyway: /sign-in shows the form, or sends a signed-in Admin on, and the next risky call
      // asks again if the session is still old.
    }
    // A full navigation, so no cached page of the signed-out session is left behind.
    window.location.assign(signInUrl(`/accounts/${encodeURIComponent(accountId)}`));
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-sm text-muted-foreground">{t("freshRequired")}</p>
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={signInAgain}>
        {pending ? t("signingInAgain") : t("signInAgain")}
      </Button>
    </div>
  );
}
