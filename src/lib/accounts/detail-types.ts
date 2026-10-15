import { z } from "zod";

const localized = z.object({ ar: z.string(), en: z.string() });
const count = z.number().int().nonnegative();
const limit = count.nullable();

// The contracts of the Account detail routes (backend AGENTS.md, "Account detail routes"). Unknown
// fields are dropped.

export const ENROLLMENT_END_REASONS = ["unenrolled", "ended_by_admin"] as const;

export const enrollmentSchema = z.object({
  id: z.string().min(1),
  course: z.object({ id: z.string().min(1), code: z.string(), name: localized }),
  enrolledAt: z.string(),
  endedAt: z.string().nullable(),
  endReason: z.enum(ENROLLMENT_END_REASONS).nullable(),
});
export const enrollmentsResponseSchema = z.array(enrollmentSchema);
export type AdminEnrollment = z.infer<typeof enrollmentSchema>;

// GET /admin/accounts/:id/allowance: the body of the Student's own /me/allowance.
export const allowanceSchema = z.object({
  unlimited: z.boolean().optional().default(false),
  plan: z.object({ id: z.string().min(1), name: localized }),
  period: z.object({ start: z.string(), end: z.string() }),
  limits: z.object({
    sessions: limit,
    seconds: limit,
    enrollments: limit,
    sessionSeconds: limit,
    minStartSeconds: limit,
  }),
  usage: z.object({ sessions: count, seconds: count, enrollments: count }),
});
export type AccountAllowance = z.infer<typeof allowanceSchema>;

export const SESSION_STATES = ["held", "open", "ended"] as const;
export const SESSION_KINDS = ["student", "admin"] as const;
export const SESSION_END_REASONS = ["superseded", "no_leave_event"] as const;

export const sessionSchema = z.object({
  id: z.string().min(1),
  room: z.string().min(1),
  course: z.object({ id: z.string(), code: z.string(), name: localized }),
  chapterNumber: count,
  kind: z.enum(SESSION_KINDS),
  grantedSeconds: count,
  sessionLimit: z.string(),
  issuedAt: z.string(),
  firstJoinedAt: z.string().nullable(),
  endedAt: z.string().nullable(),
  endReason: z.enum(SESSION_END_REASONS).nullable(),
  connectedSeconds: z.number().nonnegative(),
  state: z.enum(SESSION_STATES),
});
export type AdminStudySession = z.infer<typeof sessionSchema>;

export const sessionsResponseSchema = z.object({
  sessions: z.array(sessionSchema),
  total: count,
  limit: z.number().int().positive(),
  offset: count,
});
export type SessionsResponse = z.infer<typeof sessionsResponseSchema>;

// GET /api/v1/courses (public Catalog). Only what the picker needs.
export const catalogCourseSchema = z.object({
  id: z.string().min(1),
  code: z.string(),
  name: localized,
});
export const catalogResponseSchema = z.array(catalogCourseSchema);
export type CatalogCourse = z.infer<typeof catalogCourseSchema>;
