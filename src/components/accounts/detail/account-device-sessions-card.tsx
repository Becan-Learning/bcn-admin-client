"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { LaptopIcon } from "lucide-react";
import { FormError } from "@/components/auth/form-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listAccountSessions,
  revokeAccountSession,
  revokeAccountSessions,
  type AccountDeviceSession,
} from "@/lib/accounts/account-actions";
import type { AuthErrorKey } from "@/lib/auth/errors";
import { ConfirmDialog } from "./confirm-dialog";
import { timeValues } from "./date-time";
import { useAccountAction } from "./use-account-action";

type Load =
  | { status: "loading" }
  | { status: "failed"; errorKey: AuthErrorKey }
  | { status: "ready"; sessions: AccountDeviceSession[] };

// The Account's Device sessions (`admin.listUserSessions`), newest first. Revoke one (`revokeUserSession`)
// or all behind a confirm (`revokeUserSessions`). The session token is kept only to revoke by it and is
// never rendered. `reloadKey` changes when the Account does (a ban ends every session), so the list reloads.
export function AccountDeviceSessionsCard({
  accountId,
  isSelf,
  currentSessionId,
  reloadKey,
}: {
  accountId: string;
  isSelf: boolean;
  // The signed-in Admin's own Device session, which is in this list when they view their own Account.
  currentSessionId: string;
  reloadKey: string;
}) {
  const t = useTranslations("AccountDetail.actions.devices");
  const common = useTranslations("Common");
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [reloads, setReloads] = useState(0);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const one = useAccountAction();
  const all = useAccountAction();

  useEffect(() => {
    let cancelled = false;
    listAccountSessions(accountId).then((result) => {
      if (cancelled) return;
      setLoad(
        result.ok
          ? { status: "ready", sessions: sortNewestFirst(result.sessions) }
          : { status: "failed", errorKey: result.errorKey },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [accountId, reloadKey, reloads]);

  const reload = () => setReloads((n) => n + 1);
  const sessions = load.status === "ready" ? load.sessions : [];
  const busy = one.pending || all.pending;

  async function revokeOne(session: AccountDeviceSession) {
    all.reset();
    setRevokingId(session.id);
    try {
      await one.run(() => revokeAccountSession(session.token), t("revoked"));
    } finally {
      setRevokingId(null);
      reload();
    }
  }

  async function revokeAll() {
    one.reset();
    const result = await all.run(() => revokeAccountSessions(accountId), t("revokedAll"));
    if (result.ok) setConfirmAll(false);
    reload();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <FormError errorKey={one.errorKey} />
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
              type="button"
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
        {load.status === "ready" && sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : null}
        {sessions.length > 0 ? (
          <ul className="flex flex-col divide-y rounded-lg border">
            {sessions.map((session) => {
              const device = session.userAgent || t("unknownDevice");
              const isCurrent = isSelf && session.id === currentSessionId;
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
                      {t.rich("created", timeValues(session.createdAt))}
                      {" · "}
                      {t.rich("expires", timeValues(session.expiresAt))}
                    </span>
                  </div>
                  {isCurrent ? null : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={t("revokeLabel", { device })}
                      disabled={busy}
                      onClick={() => revokeOne(session)}
                    >
                      {revokingId === session.id ? t("revoking") : t("revoke")}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}
        {sessions.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={busy || isSelf}
              onClick={() => {
                all.reset();
                setConfirmAll(true);
              }}
            >
              {t("revokeAll")}
            </Button>
            {isSelf ? <p className="text-sm text-muted-foreground">{t("selfNote")}</p> : null}
          </div>
        ) : null}
        {one.done ? (
          <p role="status" className="text-sm text-muted-foreground">
            {one.done}
          </p>
        ) : null}
        {all.done ? (
          <p role="status" className="text-sm text-muted-foreground">
            {all.done}
          </p>
        ) : null}
      </CardContent>

      <ConfirmDialog
        open={confirmAll}
        onOpenChange={setConfirmAll}
        title={t("revokeAllTitle")}
        description={t("revokeAllDescription")}
        confirmLabel={t("revokeAllConfirm")}
        pendingLabel={t("revokingAll")}
        pending={all.pending}
        errorKey={all.errorKey}
        destructive
        onConfirm={revokeAll}
      />
    </Card>
  );
}

function sortNewestFirst(sessions: AccountDeviceSession[]): AccountDeviceSession[] {
  return [...sessions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
