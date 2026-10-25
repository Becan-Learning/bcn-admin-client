import { z } from "zod";
import { RANGES } from "./range";

// The contract of GET /api/v1/admin/insights (docs/backend-insights-contract.md). Unknown fields are
// dropped.

export const BUCKETS = ["day", "week"] as const;
export type InsightsBucket = (typeof BUCKETS)[number];

// The six usage bands, in the order the backend sends them.
export const ALLOWANCE_BANDS = ["0", "1-25", "26-50", "51-75", "76-99", "100"] as const;
export type AllowanceBand = (typeof ALLOWANCE_BANDS)[number];

const localized = z.object({ ar: z.string(), en: z.string() });
const count = z.number().int().nonnegative();
const seconds = z.number().nonnegative();

const bucketPoint = z.object({
  // The bucket's first local day, YYYY-MM-DD.
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  signups: count,
  activeStudents: count,
  heldSessions: count,
  studySeconds: seconds,
});

const chapterRow = z.object({
  number: count,
  title: localized,
  published: z.boolean(),
  heldSessions: count,
  studySeconds: seconds,
  activeStudents: count,
});

const courseRow = z.object({
  id: z.string().min(1),
  code: z.string(),
  name: localized,
  heldSessions: count,
  studySeconds: seconds,
  activeStudents: count,
  chapters: z.array(chapterRow),
});

const institutionRow = z.object({
  id: z.string().min(1),
  name: localized,
  students: count,
  signups: count,
  majors: z.array(
    z.object({ id: z.string().min(1), name: localized, students: count, signups: count }),
  ),
});

const planRow = z.object({
  id: z.string().min(1),
  name: localized,
  students: count,
  atLimit: count,
  usage: z.array(z.object({ band: z.enum(ALLOWANCE_BANDS), students: count })),
});

export const insightsSchema = z.object({
  range: z.enum(RANGES),
  timeZone: z.string().min(1),
  bucket: z.enum(BUCKETS),
  from: z.string(),
  to: z.string(),
  generatedAt: z.string(),
  totals: z.object({
    students: count,
    signups: count,
    activeStudents: count,
    heldSessions: count,
    studySeconds: seconds,
  }),
  series: z.array(bucketPoint),
  institutions: z.array(institutionRow),
  courses: z.array(courseRow),
  allowance: z.object({ plans: z.array(planRow) }),
});

export type Insights = z.infer<typeof insightsSchema>;
export type BucketPoint = z.infer<typeof bucketPoint>;
export type CourseRow = z.infer<typeof courseRow>;
export type ChapterRow = z.infer<typeof chapterRow>;
export type InstitutionRow = z.infer<typeof institutionRow>;
export type PlanRow = z.infer<typeof planRow>;
export type Localized = z.infer<typeof localized>;
