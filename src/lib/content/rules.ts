// Pure rules for the Content versions pages: what a version offers, how its report and manifest read.
// The components only draw these.
import type { ContentVersion, ManifestEntry, ReportIssue } from "./types";

// ---- Sizes ----

// "0 B", "512 B", "1.5 KB", "3.2 MB". Binary units (1 KB = 1024 B) under the usual names, one decimal
// from KB up, ASCII digits only.
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  // 1023.96 KB would round to "1024.0 KB": step up instead.
  if (Number(value.toFixed(1)) >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}

export function manifestTotal(manifest: readonly ManifestEntry[]): number {
  return manifest.reduce((sum, entry) => sum + entry.size, 0);
}

// ---- The validation report ----

export type ReportGroup = { file: string; issues: ReportIssue[] };

// Groups the findings by file, in the order the files first appear. A finding about the archive as a
// whole has an empty `file`; it is kept under "" and the view names it. Within a file, the order is the
// validator's.
export function groupReport(report: readonly ReportIssue[]): ReportGroup[] {
  const groups = new Map<string, ReportIssue[]>();
  for (const issue of report) {
    const list = groups.get(issue.file);
    if (list) list.push(issue);
    else groups.set(issue.file, [issue]);
  }
  return [...groups].map(([file, issues]) => ({ file, issues }));
}

// ---- What an Admin can do with a version ----

export type LiveAction = "set-live" | "rollback";

// Set live: a valid version that is not live. It is a rollback when a live version exists and is newer
// (higher version number); otherwise it is a plain "set live" (nothing is live yet, or this one is newer).
export function liveAction(version: ContentVersion, versions: readonly ContentVersion[]): LiveAction | null {
  if (!version.valid || version.live) return null;
  const live = versions.find((candidate) => candidate.live);
  return live && live.version > version.version ? "rollback" : "set-live";
}

export type DeleteBlocker = "live" | "wasLive" | "sessions";

// Why a version cannot be deleted, most specific first; empty when it can. The backend's `deletable` is
// the truth: this only explains it. A version that is live is also "was live", so only `live` is said.
export function deleteBlockers(version: ContentVersion): DeleteBlocker[] {
  if (version.deletable) return [];
  const blockers: DeleteBlocker[] = [];
  if (version.live) blockers.push("live");
  else if (version.firstLiveAt !== null) blockers.push("wasLive");
  if (version.sessions > 0) blockers.push("sessions");
  return blockers;
}

// A valid version that was never live and that no Admin has previewed: the one to look at before going live.
export function needsPreview(version: ContentVersion): boolean {
  return version.valid && !version.live && version.firstLiveAt === null && !version.preview.previewed;
}

// The live version of a list, if any.
export function liveVersionOf(versions: readonly ContentVersion[]): ContentVersion | null {
  return versions.find((version) => version.live) ?? null;
}
