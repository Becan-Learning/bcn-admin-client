"use client";

import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { LogOutIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSignOut } from "@/components/auth/sign-out-button";

export type SignedInAdmin = { name: string; email: string };

function initialOf(name: string, email: string): string {
  return (Array.from(name.trim())[0] ?? Array.from(email)[0] ?? "?").toUpperCase();
}

// The signed-in Admin and the sign-out action. Names can be Arabic, so they use `dir="auto"`.
export function UserMenu({ admin }: { admin: SignedInAdmin }) {
  const t = useTranslations("Header");
  const common = useTranslations("Common");
  const { theme, setTheme } = useTheme();
  const { signOut, pending } = useSignOut();

  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-48 truncate text-sm text-muted-foreground sm:inline" dir="auto">
        {admin.name}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t("userMenu")}>
            <Avatar className="size-8">
              <AvatarFallback dir="auto">{initialOf(admin.name, admin.email)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="font-normal">
            <span className="sr-only">{t("signedInAs", { name: admin.name })}</span>
            <div className="grid text-sm leading-tight" aria-hidden>
              <span className="truncate font-medium" dir="auto">
                {admin.name}
              </span>
              <span className="truncate text-xs text-muted-foreground" dir="auto">
                {admin.email}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">{t("theme")}</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
            <DropdownMenuRadioItem value="light">
              <SunIcon />
              {t("themeLight")}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">
              <MoonIcon />
              {t("themeDark")}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system">
              <MonitorIcon />
              {t("themeSystem")}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={pending} onSelect={() => void signOut()}>
            <LogOutIcon />
            {common("signOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
