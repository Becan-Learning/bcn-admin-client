"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { BookOpenIcon, ScrollTextIcon, ShieldCheckIcon, UserRoundIcon, UsersIcon } from "lucide-react";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";

// An item with `children` is a section: its button opens the first child, and the children are listed
// under it (hidden while the sidebar is collapsed to icons). The section is active on any child page.
// AD2 to AD4 add their pages to the Catalog's children.
const NAV_ITEMS = [
  { key: "accounts", href: "/accounts", icon: UsersIcon },
  {
    key: "catalog",
    href: "/catalog",
    icon: BookOpenIcon,
    children: [
      { key: "catalogInstitutions", href: "/catalog/institutions" },
      { key: "catalogCourses", href: "/catalog/courses" },
    ],
  },
  { key: "auditLog", href: "/audit-log", icon: ScrollTextIcon },
  { key: "myAccount", href: "/my-account", icon: UserRoundIcon },
] as const;

function isOn(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

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
              {NAV_ITEMS.map((item) => {
                const { key, href, icon: Icon } = item;
                const children = "children" in item ? item.children : null;
                return (
                  <SidebarMenuItem key={key}>
                    <SidebarMenuButton
                      asChild
                      tooltip={t(key)}
                      isActive={isOn(pathname, href)}
                    >
                      <Link href={children ? children[0].href : href}>
                        <Icon />
                        <span>{t(key)}</span>
                      </Link>
                    </SidebarMenuButton>
                    {children ? (
                      <SidebarMenuSub>
                        {children.map((child) => (
                          <SidebarMenuSubItem key={child.key}>
                            <SidebarMenuSubButton asChild isActive={isOn(pathname, child.href)}>
                              <Link href={child.href}>
                                <span>{t(child.key)}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    ) : null}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
