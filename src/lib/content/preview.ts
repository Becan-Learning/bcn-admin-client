// The "Preview in student app" link of a Chapter version (web ADR 0005, W2): the student app's session page
// pinned to one version. `STUDENT_APP_URL` is a server-only env var, read at request time.

// The student app's base URL from the env value, or null when it is unset, empty or not an http(s) URL.
// Only the origin and path are kept (no query, hash or trailing slash), so a pasted URL still works.
export function parseStudentAppUrl(raw: string | undefined | null): string | null {
  const text = raw?.trim();
  if (!text) return null;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
}

// `${base}/session/{courseSlug}/{chapterId}?version={versionId}`. `courseVersionId` also pins the Course
// side (`&courseVersion=`); leave it out to use the Course's live version.
export function previewUrl(
  base: string,
  target: { courseSlug: string; chapterId: string; versionId: string; courseVersionId?: string | null },
): string {
  const query = new URLSearchParams({ version: target.versionId });
  if (target.courseVersionId) query.set("courseVersion", target.courseVersionId);
  return `${base}/session/${encodeURIComponent(target.courseSlug)}/${encodeURIComponent(target.chapterId)}?${query}`;
}
