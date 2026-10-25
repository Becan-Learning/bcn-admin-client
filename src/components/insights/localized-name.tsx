import type { ReactNode } from "react";
import type { Localized } from "@/lib/insights/types";

// A Catalog name as the Admin reads it: the English name with an optional prefix (a code, a number),
// the Arabic name beneath. The blocks stay LTR so both lines align left; each name is isolated in a
// `<bdi>` because it is Catalog content.
export function LocalizedName({ prefix, name }: { prefix?: ReactNode; name: Localized }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span>
        {prefix ? <span className="font-medium">{prefix}</span> : null}
        {prefix ? " " : null}
        <bdi>{name.en}</bdi>
      </span>
      <span lang="ar" className="text-xs text-muted-foreground">
        <bdi>{name.ar}</bdi>
      </span>
    </div>
  );
}
