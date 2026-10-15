"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth/client";

export type AdminActor = { id: string; name: string; email: string };
export type AdminActors = { status: "loading" } | { status: "failed" } | { status: "ready"; actors: AdminActor[] };

// The Admins an Audit log entry can be filtered by. Loaded once per visit.
export function useAdminActors(): AdminActors {
  const [state, setState] = useState<AdminActors>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    authClient.admin
      .listUsers({ query: { filterField: "role", filterValue: "admin", limit: 100 } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setState({ status: "failed" });
          return;
        }
        const actors = data.users
          .map((user) => ({ id: user.id, name: user.name, email: user.email }))
          .sort((a, b) => a.name.localeCompare(b.name) || a.email.localeCompare(b.email));
        setState({ status: "ready", actors });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "failed" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
