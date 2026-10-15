import { useTranslations } from "next-intl";
import { formatBytes, manifestTotal } from "@/lib/content/rules";
import type { ManifestEntry } from "@/lib/content/types";

// The files of a version from its manifest (recorded at upload: path, size, SHA-256). The list comes from the
// database; Bunny is never listed. A version registered in place has no manifest.
export function VersionFiles({ manifest }: { manifest: ManifestEntry[] | null }) {
  const t = useTranslations("ContentVersions.detail");
  if (manifest === null) return <p className="text-sm text-muted-foreground">{t("filesNone")}</p>;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground tabular-nums">
        {t("filesSummary", { count: manifest.length, size: formatBytes(manifestTotal(manifest)) })}
      </p>
      <div className="max-h-72 overflow-y-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted text-left text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-1.5 font-medium">
                {t("colPath")}
              </th>
              <th scope="col" className="px-3 py-1.5 text-right font-medium">
                {t("colSize")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {manifest.map((entry) => (
              <tr key={entry.path}>
                <td className="px-3 py-1.5">
                  <code dir="ltr" className="font-mono text-xs break-all">
                    <bdi>{entry.path}</bdi>
                  </code>
                </td>
                <td className="px-3 py-1.5 text-right whitespace-nowrap tabular-nums">{formatBytes(entry.size)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
