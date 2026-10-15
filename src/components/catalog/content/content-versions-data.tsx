import { Suspense } from "react";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { SectionError, SectionSkeleton } from "@/components/accounts/detail/section-states";
import { fetchContentVersions } from "@/lib/catalog/fetch";
import { previewUrl } from "@/lib/content/preview";
import { studentAppUrl } from "@/lib/content/student-app";
import type { ContentOwnerKind } from "@/lib/content/types";
import { ContentVersionsCard } from "./content-versions-card";

// The Content versions section of a Chapter or a Course. It loads its own data (`GET /admin/.../versions`)
// inside its own <Suspense>, so a failure here leaves the rest of the page alone. For a Chapter,
// `preview` carries what the "Preview in student app" link needs (the Course slug and the Chapter id); the
// base URL is STUDENT_APP_URL, read here at request time, and the links are built on the server.
export async function ContentVersionsSection({
  kind,
  ownerId,
  preview,
}: {
  kind: ContentOwnerKind;
  ownerId: string;
  preview?: { courseSlug: string; chapterId: string };
}) {
  const t = await getTranslations(`ContentVersions.${kind}`);
  return (
    <Suspense fallback={<SectionSkeleton label={t("loading")} />}>
      <ContentVersionsData kind={kind} ownerId={ownerId} preview={preview} />
    </Suspense>
  );
}

async function ContentVersionsData({
  kind,
  ownerId,
  preview,
}: {
  kind: ContentOwnerKind;
  ownerId: string;
  preview?: { courseSlug: string; chapterId: string };
}) {
  const [t, errors, incoming] = await Promise.all([
    getTranslations(`ContentVersions.${kind}`),
    getTranslations("Errors"),
    headers(),
  ]);
  const result = await fetchContentVersions(kind, ownerId, incoming);
  if (!result.ok) return <SectionError title={t("loadFailed")} message={errors(result.errorKey)} />;

  const base = preview ? studentAppUrl() : null;
  const previewUrls =
    preview && base
      ? Object.fromEntries(
          result.versions
            .filter((version) => version.valid)
            .map((version) => [
              version.id,
              previewUrl(base, { courseSlug: preview.courseSlug, chapterId: preview.chapterId, versionId: version.id }),
            ]),
        )
      : null;

  return (
    <ContentVersionsCard
      kind={kind}
      ownerId={ownerId}
      title={t("title")}
      description={t("description")}
      expects={t("expects")}
      versions={result.versions}
      previewUrls={previewUrls}
    />
  );
}
