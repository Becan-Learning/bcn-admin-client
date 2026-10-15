import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { UserMenu } from "@/components/shell/user-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import type { AdminSession } from "@/lib/auth/session";

export async function DashboardShell({
  session,
  children,
}: {
  session: AdminSession;
  children: ReactNode;
}) {
  const t = await getTranslations("Nav");
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ms-1" aria-label={t("toggleSidebar")} />
          <Separator orientation="vertical" className="me-2 data-vertical:h-4 data-vertical:self-auto" />
          <div className="ms-auto">
            <UserMenu admin={{ name: session.user.name, email: session.user.email }} />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function DashboardShellSkeleton() {
  return (
    <div className="flex min-h-svh">
      <div className="hidden w-64 shrink-0 border-e bg-sidebar md:block" />
      <div className="flex flex-1 flex-col">
        <div className="h-14 border-b" />
      </div>
    </div>
  );
}
