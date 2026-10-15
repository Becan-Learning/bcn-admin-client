"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { LaptopIcon } from "lucide-react";
import { FormError } from "@/components/auth/form-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth/client";
import { authErrorKey, type AuthClientError, type AuthErrorKey } from "@/lib/auth/errors";
import { sortDeviceSessions, type DeviceSession } from "@/lib/account/device-sessions";

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

type Load =
  | { status: "loading" }
  | { status: "failed"; errorKey: AuthErrorKey }
  | { status: "ready"; sessions: DeviceSession[] };

export function DeviceSessionsCard({ currentSessionId }: { currentSessionId: string }) {
  const t = useTranslations("MyAccount.sessions");
  const common = useTranslations("Common");
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [reloads, setReloads] = useState(0);
  // The token being revoked, or "others" for the bulk action.
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<AuthErrorKey | null>(null);

  useEffect(() => {
    let cancelled = false;
    authClient
      .listSessions()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setLoad({ status: "failed", errorKey: authErrorKey(error) });
          return;
        }
        setLoad({ status: "ready", sessions: sortDeviceSessions(data, currentSessionId) });
      })
      .catch(() => {
        if (!cancelled) setLoad({ status: "failed", errorKey: "NETWORK" });
      });
    return () => {
      cancelled = true;
    };
  }, [currentSessionId, reloads]);

  const reload = useCallback(() => setReloads((n) => n + 1), []);

  async function run(id: string, action: () => Promise<{ error: AuthClientError }>) {
    setBusy(id);
    setActionError(null);
    try {
      const { error } = await action();
      if (error) setActionError(authErrorKey(error));
    } catch {
      setActionError("NETWORK");
    } finally {
      setBusy(null);
      reload();
    }
  }

  const sessions = load.status === "ready" ? load.sessions : [];
  const others = sessions.filter((session) => session.id !== currentSessionId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <FormError errorKey={actionError} />
        {load.status === "loading" ? (
          <div role="status" aria-label={t("loading")} className="flex flex-col gap-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : null}
        {load.status === "failed" ? (
          <div className="flex flex-col items-start gap-3">
            <FormError errorKey={load.errorKey} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLoad({ status: "loading" });
                reload();
              }}
            >
              {common("tryAgain")}
            </Button>
          </div>
        ) : null}
        {load.status === "ready" ? (
          <ul className="flex flex-col divide-y rounded-lg border">
            {sessions.map((session) => {
              const isCurrent = session.id === currentSessionId;
              const device = session.userAgent || t("unknownDevice");
              return (
                <li key={session.id} className="flex flex-wrap items-center gap-3 p-3">
                  <LaptopIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                  <div className="grid min-w-0 flex-1 gap-0.5">
                    <span className="flex flex-wrap items-center gap-2 text-sm">
                      <span dir="ltr" title={device} className="line-clamp-2 break-all">
                        {device}
                      </span>
                      {isCurrent ? <Badge variant="secondary">{t("current")}</Badge> : null}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      <span dir="ltr">{session.ipAddress || t("unknownIp")}</span>
                      {" · "}
                      {t("signedInAt", { date: formatDate(session.createdAt) })}
                    </span>
                  </div>
                  {isCurrent ? null : (
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={t("revokeLabel", { device })}
                      disabled={busy !== null}
                      onClick={() => run(session.token, () => authClient.revokeSession({ token: session.token }))}
                    >
                      {busy === session.token ? t("revoking") : t("revoke")}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}
        {load.status === "ready" ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              disabled={busy !== null || others.length === 0}
              onClick={() => run("others", () => authClient.revokeOtherSessions())}
            >
              {busy === "others" ? t("revokingOthers") : t("revokeOthers")}
            </Button>
            {others.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noOthers")}</p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function formatDate(value: Date | string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : dateFormat.format(date);
}
