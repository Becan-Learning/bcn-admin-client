import { Suspense, type ReactNode } from "react";
import { DashboardShell, DashboardShellSkeleton } from "@/components/shell/dashboard-shell";
import { requireGate } from "@/lib/auth/guard";

// The server-side half of the gate. proxy.ts only checks that a session cookie exists; this asks
// the backend who the cookie belongs to. The backend re-checks every call: this only decides
// what to render.
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<DashboardShellSkeleton />}>
      <GatedShell>{children}</GatedShell>
    </Suspense>
  );
}

async function GatedShell({ children }: { children: ReactNode }) {
  // Redirects to /sign-in, /no-access or /setup-two-factor unless the gate says "ok".
  const session = await requireGate("ok");
  return <DashboardShell session={session}>{children}</DashboardShell>;
}
