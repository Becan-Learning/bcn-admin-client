"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ScrollTextIcon, ShieldCheckIcon, UserRoundIcon, UsersIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const NAV_ITEMS = [
  { key: "accounts", href: "/accounts", icon: UsersIcon },
  { key: "auditLog", href: "/audit-log", icon: ScrollTextIcon },
  { key: "myAccount", href: "/my-account", icon: UserRoundIcon },
] as const;

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const t = useTranslations("Nav");
  const meta = useTranslations("Metadata");
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/accounts">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <ShieldCheckIcon className="size-4" />
                </div>
                <span className="truncate font-medium">{meta("appName")}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("label")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map(({ key, href, icon: Icon }) => (
                <SidebarMenuItem key={key}>
                  <SidebarMenuButton
                    asChild
                    tooltip={t(key)}
                    isActive={pathname === href || pathname.startsWith(`${href}/`)}
                  >
                    <Link href={href}>
                      <Icon />
                      <span>{t(key)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
