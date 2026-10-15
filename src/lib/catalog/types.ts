import { z } from "zod";

const localized = z.object({ ar: z.string(), en: z.string() });

// GET /api/v1/admin/institutions and /majors (backend `AdminInstitutionDto` and `AdminMajorDto`).
// Unknown fields are dropped.
export const adminInstitutionSchema = z.object({
  id: z.string().min(1),
  name: localized,
  sortOrder: z.number().int(),
  counts: z.object({
    majors: z.number().int().nonnegative(),
    courses: z.number().int().nonnegative(),
    accounts: z.number().int().nonnegative(),
  }),
  createdAt: z.string(),
});

export const adminMajorSchema = z.object({
  id: z.string().min(1),
  institutionId: z.string().min(1),
  name: localized,
  sortOrder: z.number().int(),
  counts: z.object({ accounts: z.number().int().nonnegative() }),
  createdAt: z.string(),
});

export const adminInstitutionsResponseSchema = z.object({
  institutions: z.array(adminInstitutionSchema),
});
export const adminMajorsResponseSchema = z.object({ majors: z.array(adminMajorSchema) });

export type AdminInstitution = z.infer<typeof adminInstitutionSchema>;
export type AdminMajor = z.infer<typeof adminMajorSchema>;

// An Institution with its Majors, in the backend's order (sort order, then id).
export type InstitutionWithMajors = AdminInstitution & { majors: AdminMajor[] };

// Puts each Major under its Institution. The backend already orders both lists (Institutions by sort
// order then id, Majors by Institution, sort order then id), and this keeps that order. A Major whose
// Institution is missing from the list is left out: the foreign key means it cannot happen.
export function groupMajors(
  institutions: AdminInstitution[],
  majors: AdminMajor[],
): InstitutionWithMajors[] {
  const byInstitution = new Map<string, AdminMajor[]>();
  for (const major of majors) {
    const list = byInstitution.get(major.institutionId);
    if (list) list.push(major);
    else byInstitution.set(major.institutionId, [major]);
  }
  return institutions.map((institution) => ({
    ...institution,
    majors: byInstitution.get(institution.id) ?? [],
  }));
}

// Courses (backend `AdminCourseDto`). The icon and tone sets are the backend's CHECK constraints on
// `course.icon` and `course.tone` (src/db/schema/catalog-schema.ts); the student app draws them.
export const COURSE_STATUSES = ["draft", "published", "archived"] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export const COURSE_ICONS = [
  "coins",
  "bars",
  "blocks",
  "torus",
  "flask",
  "atom",
  "donut",
  "cube",
  "bolt",
] as const;
export type CourseIcon = (typeof COURSE_ICONS)[number];

export const COURSE_TONES = ["lilac", "base", "deep", "amber", "walnut", "olive", "oliveDark"] as const;
export type CourseTone = (typeof COURSE_TONES)[number];

export function isCourseStatus(value: unknown): value is CourseStatus {
  return COURSE_STATUSES.some((status) => status === value);
}
export function isCourseIcon(value: unknown): value is CourseIcon {
  return COURSE_ICONS.some((icon) => icon === value);
}
export function isCourseTone(value: unknown): value is CourseTone {
  return COURSE_TONES.some((tone) => tone === value);
}

const count = z.number().int().nonnegative();

export const adminCourseSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  status: z.enum(COURSE_STATUSES),
  code: z.string(),
  name: localized,
  institution: z.object({ id: z.string().min(1), name: localized }),
  icon: z.enum(COURSE_ICONS),
  tone: z.enum(COURSE_TONES),
  sortOrder: z.number().int(),
  liveContentVersionId: z.string().nullable(),
  counts: z.object({
    chapters: z.object({
      draft: count,
      comingSoon: count,
      published: count,
      archived: count,
    }),
    enrollments: count,
    activeEnrollments: count,
    sessions: count,
    contentVersions: count,
  }),
  deletable: z.boolean(),
  createdAt: z.string(),
});

// GET /api/v1/admin/courses answers `{ courses }`, in the backend's order (Institution sort order,
// Course sort order, code, id); GET /courses/:id answers one Course.
export const adminCoursesResponseSchema = z.object({ courses: z.array(adminCourseSchema) });

export type AdminCourse = z.infer<typeof adminCourseSchema>;

// Chapters (backend `AdminChapterDto`). Draft and Archived Chapters may share a number with a live one;
// only Coming soon and Published Chapters have a number that is unique within their Course.
export const CHAPTER_STATES = ["draft", "coming_soon", "published", "archived"] as const;
export type ChapterState = (typeof CHAPTER_STATES)[number];

export function isChapterState(value: unknown): value is ChapterState {
  return CHAPTER_STATES.some((state) => state === value);
}

export const adminChapterSchema = z.object({
  id: z.string().min(1),
  courseId: z.string().min(1),
  number: z.number().int(),
  title: localized,
  minutes: z.number().int(),
  lessonCount: z.number().int().nonnegative(),
  state: z.enum(CHAPTER_STATES),
  // The live Chapter content version, or null while the Chapter has none.
  liveContentVersionId: z.string().nullable(),
  counts: z.object({ sessions: count, contentVersions: count }),
  deletable: z.boolean(),
  createdAt: z.string(),
});

// GET /api/v1/admin/courses/:id/chapters answers `{ chapters }` in every state, by number; GET
// /chapters/:id answers one Chapter.
export const adminChaptersResponseSchema = z.object({ chapters: z.array(adminChapterSchema) });

export type AdminChapter = z.infer<typeof adminChapterSchema>;
