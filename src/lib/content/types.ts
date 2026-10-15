import { z } from "zod";

// Content versions (backend `ContentVersionDto`, `GET /admin/{chapters|courses}/:id/versions`). A version
// is one immutable upload. Unknown fields are dropped. `manifest` and `report` are null for a version
// registered in place (the existing `becan-test` content): there was no upload to record.
export const CONTENT_OWNER_KINDS = ["chapter", "course"] as const;
export type ContentOwnerKind = (typeof CONTENT_OWNER_KINDS)[number];

export const manifestEntrySchema = z.object({
  path: z.string(),
  size: z.number().int().nonnegative(),
  sha256: z.string(),
});

// One validator finding: the file it is about, a JSON Pointer into it ("" for the file as a whole), the
// stable rule name and the message. The validator's own English text.
export const reportIssueSchema = z.object({
  file: z.string(),
  path: z.string(),
  rule: z.string(),
  message: z.string(),
});

const count = z.number().int().nonnegative();

export const contentVersionSchema = z.object({
  id: z.string().min(1),
  ownerKind: z.enum(CONTENT_OWNER_KINDS),
  ownerId: z.string().min(1),
  version: z.number().int().positive(),
  prefix: z.string(),
  valid: z.boolean(),
  live: z.boolean(),
  lessonCount: count.nullable(),
  firstLiveAt: z.string().nullable(),
  createdAt: z.string(),
  createdBy: z.object({ id: z.string(), name: z.string() }).nullable(),
  manifest: z.array(manifestEntrySchema).nullable(),
  report: z.array(reportIssueSchema).nullable(),
  preview: z.object({ previewed: z.boolean(), adminSessions: count }),
  sessions: count,
  deletable: z.boolean(),
});

// Newest first.
export const contentVersionsResponseSchema = z.object({ versions: z.array(contentVersionSchema) });

// `POST .../upload-token`.
export const uploadTokenSchema = z.object({
  token: z.string().min(1),
  uploadUrl: z.string().min(1),
  expiresAt: z.string(),
});

export type ContentVersion = z.infer<typeof contentVersionSchema>;
export type ManifestEntry = z.infer<typeof manifestEntrySchema>;
export type ReportIssue = z.infer<typeof reportIssueSchema>;
export type UploadToken = z.infer<typeof uploadTokenSchema>;

// The route segment of an owner kind: `chapters/:id` or `courses/:id`.
export function ownerPath(kind: ContentOwnerKind, id: string): string {
  return `${kind === "chapter" ? "chapters" : "courses"}/${encodeURIComponent(id)}`;
}
