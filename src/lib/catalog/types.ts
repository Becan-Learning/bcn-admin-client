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
