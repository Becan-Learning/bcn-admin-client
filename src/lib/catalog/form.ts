// The Institution and Major forms, as pure functions: what to validate, what to send. The components
// only hold state and call the backend. Names and sort order are strings while the Admin types.
import type { CatalogField } from "./errors";
import { isValidSlug } from "./slug";

export const NAME_MAX_LENGTH = 200;
export const SORT_ORDER_MAX = 1_000_000;

export type InstitutionValues = { nameEn: string; nameAr: string; sortOrder: string };
export type MajorValues = InstitutionValues & { institutionId: string };

// What POST sends (the id is part of a create, never of an edit).
export type InstitutionCreateBody = {
  id: string;
  nameEn: string;
  nameAr: string;
  sortOrder: number;
};
export type MajorCreateBody = InstitutionCreateBody & { institutionId: string };

// What PATCH sends: only the changed fields. The backend refuses an unknown key, and an empty body.
export type InstitutionChanges = Partial<{ nameEn: string; nameAr: string; sortOrder: number }>;
export type MajorChanges = InstitutionChanges & Partial<{ institutionId: string }>;

// "12" is 12. Anything that is not a whole number from 0 to 1,000,000 is null: no decimals, no
// exponents, no signs, and blank is not 0.
export function parseSortOrder(input: string): number | null {
  const text = input.trim();
  if (!/^\d{1,7}$/.test(text)) return null;
  const value = Number(text);
  return value <= SORT_ORDER_MAX ? value : null;
}

export type FormIssue =
  | "required"
  | "invalidId"
  | "tooLong"
  | "invalidSortOrder"
  | "invalidNumber"
  | "invalidMinutes"
  | "invalidLessonCount";
export type FormIssues = Partial<Record<CatalogField, FormIssue>>;

function nameIssue(value: string): FormIssue | null {
  const name = value.trim();
  if (name === "") return "required";
  return name.length > NAME_MAX_LENGTH ? "tooLong" : null;
}

// Checks that need no backend. Whether an id or an Institution exists is the backend's to judge and
// comes back as a field error. `id` is only checked on a create (pass `null` on an edit).
export function validateForm(
  values: InstitutionValues & { institutionId?: string },
  id: string | null,
  options: { needsInstitution?: boolean } = {},
): FormIssues {
  const issues: FormIssues = {};
  if (id !== null) {
    if (id === "") issues.id = "required";
    else if (!isValidSlug(id)) issues.id = "invalidId";
  }
  const nameEn = nameIssue(values.nameEn);
  if (nameEn) issues.nameEn = nameEn;
  const nameAr = nameIssue(values.nameAr);
  if (nameAr) issues.nameAr = nameAr;
  if (parseSortOrder(values.sortOrder) === null) issues.sortOrder = "invalidSortOrder";
  if (options.needsInstitution && !values.institutionId) issues.institutionId = "required";
  return issues;
}

export function hasIssues(issues: FormIssues): boolean {
  return Object.keys(issues).length > 0;
}

// Call only after `validateForm` passed: the sort order is then a number.
export function institutionCreateBody(id: string, values: InstitutionValues): InstitutionCreateBody {
  return {
    id,
    nameEn: values.nameEn.trim(),
    nameAr: values.nameAr.trim(),
    sortOrder: parseSortOrder(values.sortOrder) ?? 0,
  };
}

export function majorCreateBody(
  id: string,
  values: MajorValues,
): MajorCreateBody {
  return { ...institutionCreateBody(id, values), institutionId: values.institutionId };
}

// Only what changed, so an edit never sends (or audits) a field the Admin did not touch. Names compare
// trimmed. Empty means there is nothing to save.
export function diffInstitution(initial: InstitutionValues, current: InstitutionValues): InstitutionChanges {
  const changes: InstitutionChanges = {};
  const nameEn = current.nameEn.trim();
  const nameAr = current.nameAr.trim();
  const sortOrder = parseSortOrder(current.sortOrder);
  if (nameEn !== initial.nameEn.trim()) changes.nameEn = nameEn;
  if (nameAr !== initial.nameAr.trim()) changes.nameAr = nameAr;
  if (sortOrder !== null && sortOrder !== parseSortOrder(initial.sortOrder)) {
    changes.sortOrder = sortOrder;
  }
  return changes;
}

export function diffMajor(initial: MajorValues, current: MajorValues): MajorChanges {
  const changes: MajorChanges = diffInstitution(initial, current);
  if (current.institutionId !== initial.institutionId) changes.institutionId = current.institutionId;
  return changes;
}

export function hasChanges(changes: object): boolean {
  return Object.keys(changes).length > 0;
}
