// Turning a picked folder into the zip the backend takes. The path helpers are pure and tested; `zipFolder`
// uses fflate in the browser. Paths keep the folder the Admin picked as their first segment: the backend
// accepts one wrapping folder, so `chapter-3/lessons_list.json` and `lessons_list.json` are both fine.

// macOS and Windows litter folders with files that are not content. The backend ignores `__MACOSX` and
// `.DS_Store` too; leaving them out here keeps the upload smaller and the file count honest.
const JUNK_NAMES = new Set([".ds_store", "thumbs.db", "desktop.ini"]);

export function isJunkPath(path: string): boolean {
  const segments = path.split("/");
  if (segments.some((segment) => segment === "__MACOSX")) return true;
  const name = (segments.at(-1) ?? "").toLowerCase();
  return JUNK_NAMES.has(name) || name.startsWith("._");
}

// A path as it goes into the zip: forward slashes, no leading "./" or "/". Empty when nothing is left.
export function normalizeEntryPath(raw: string): string {
  return raw
    .replaceAll("\\", "/")
    .split("/")
    .filter((segment) => segment !== "" && segment !== ".")
    .join("/");
}

// A picked file as the picker reports it: `webkitRelativePath` for a folder pick ("folder/sub/a.json"),
// otherwise the bare name.
export type PickedFile = { name: string; webkitRelativePath?: string; size: number };

export type FolderPlan<T extends PickedFile> = {
  entries: { file: T; path: string }[];
  skipped: number;
  totalBytes: number;
};

export function planFolder<T extends PickedFile>(files: readonly T[]): FolderPlan<T> {
  const entries: { file: T; path: string }[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  let totalBytes = 0;
  for (const file of files) {
    const path = normalizeEntryPath(file.webkitRelativePath || file.name);
    if (path === "" || isJunkPath(path) || seen.has(path)) {
      skipped += 1;
      continue;
    }
    seen.add(path);
    entries.push({ file, path });
    totalBytes += file.size;
  }
  return { entries, skipped, totalBytes };
}

// The folder's own name, for the "Folder X" line: the first segment of the first path.
export function folderName(plan: FolderPlan<PickedFile>): string {
  return plan.entries[0]?.path.split("/")[0] ?? "";
}

// Already-compressed content is stored, not deflated again (compressing a PDF costs time and saves nothing).
const STORED = /\.(pdf|zip|png|jpe?g|gif|webp|mp3|mp4|woff2?)$/i;

export function compressionLevel(path: string): 0 | 6 {
  return STORED.test(path) ? 0 : 6;
}

export function isZipName(name: string): boolean {
  return /\.zip$/i.test(name);
}

// Browser only. Zips the planned files off the main thread (fflate's async `zip` runs in workers) and
// returns the archive as a Blob.
export async function zipFolder(entries: { file: File; path: string }[]): Promise<Blob> {
  const { zip } = await import("fflate");
  const data: Record<string, [Uint8Array, { level: 0 | 6 }]> = {};
  for (const { file, path } of entries) {
    data[path] = [new Uint8Array(await file.arrayBuffer()), { level: compressionLevel(path) }];
  }
  const bytes = await new Promise<Uint8Array>((resolve, reject) => {
    zip(data, (error, result) => (error ? reject(error) : resolve(result)));
  });
  return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/zip" });
}
