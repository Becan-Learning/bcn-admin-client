"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AuthErrorKey } from "@/lib/auth/errors";

// Runs one Account action and tracks it: pending while it and the refresh that follows run, the error
// key if it failed, and `done` after it succeeded. `router.refresh()` reloads the server data of the
// page (header, Profile) after a change. Shared by the Account sections.
export function useAccountAction() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const [errorKey, setErrorKey] = useState<AuthErrorKey | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function run<Failure extends { ok: false; errorKey: AuthErrorKey }>(
    action: () => Promise<{ ok: true } | Failure>,
    success: string,
  ): Promise<{ ok: true } | Failure> {
    setRunning(true);
    setErrorKey(null);
    setDone(null);
    try {
      const result = await action();
      if (result.ok) {
        setDone(success);
        startRefresh(() => router.refresh());
      } else {
        setErrorKey(result.errorKey);
      }
      return result;
    } finally {
      setRunning(false);
    }
  }

  return {
    pending: running || refreshing,
    errorKey,
    done,
    run,
    reset() {
      setErrorKey(null);
      setDone(null);
    },
  };
}
