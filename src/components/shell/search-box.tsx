"use client";

import { useEffect, useState } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

const DEBOUNCE_MS = 300;

// A search field that writes to the URL once typing pauses. The URL stays the source of truth: when
// it changes by itself (back button, "Clear filters") the field follows, unless the change is the one
// this field just sent, which would otherwise eat characters typed since. Shared by the Accounts and
// Courses lists; the caller passes the (translated) texts.
export function SearchBox({
  value,
  onCommit,
  label,
  placeholder,
  clearLabel,
}: {
  value: string;
  onCommit: (search: string) => void;
  label: string;
  placeholder: string;
  clearLabel: string;
}) {
  const [text, setText] = useState(value);
  const [sync, setSync] = useState({ url: value, sent: value });

  if (sync.url !== value) {
    setSync({ url: value, sent: value });
    if (value !== sync.sent) setText(value);
  }

  useEffect(() => {
    const search = text.trim();
    if (search === sync.sent) return;
    const timer = setTimeout(() => {
      setSync((current) => ({ ...current, sent: search }));
      onCommit(search);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, sync.sent, onCommit]);

  return (
    <div className="relative w-full sm:max-w-xs">
      <SearchIcon
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        dir="auto"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="px-8 [&::-webkit-search-cancel-button]:hidden"
      />
      {text ? (
        <button
          type="button"
          aria-label={clearLabel}
          onClick={() => setText("")}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <XIcon className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
