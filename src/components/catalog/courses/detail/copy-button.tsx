"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

// Copies a value to the clipboard and says so for two seconds. If the browser refuses (no permission,
// an insecure origin), nothing breaks: the value stays on screen to select by hand.
export function CopyButton({ value, label }: { value: string; label: string }) {
  const common = useTranslations("Common");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button type="button" variant="ghost" size="sm" aria-label={label} onClick={copy}>
      {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
      <span aria-live="polite">{copied ? common("copied") : common("copy")}</span>
    </Button>
  );
}
