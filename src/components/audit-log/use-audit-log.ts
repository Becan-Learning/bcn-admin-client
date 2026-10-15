"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchAuditLog, type AuditResult } from "@/lib/audit-log/api";
import { toBackendQuery, type AuditFilters } from "@/lib/audit-log/filters";

// Loads one page of the Audit log whenever the filters (the URL) change. `result` is null while the
// request for the current filters is in flight.
export function useAuditLog(filters: AuditFilters) {
  const query = toBackendQuery(filters).toString();
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<{ key: string; result: AuditResult } | null>(null);
  const key = `${query}#${attempt}`;

  useEffect(() => {
    const controller = new AbortController();
    void fetchAuditLog(query, controller.signal).then((result) => {
      if (!controller.signal.aborted) setSettled({ key: `${query}#${attempt}`, result });
    });
    return () => controller.abort();
  }, [query, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { result: settled?.key === key ? settled.result : null, retry };
}
