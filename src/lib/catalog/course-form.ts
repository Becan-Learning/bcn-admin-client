// The Course forms (create dialog and the Details card), as pure functions: what to validate, what to
// send. The components only hold state and call the backend. The slug is editable (unlike an
// Institution's id); the UUID never is and never appears in a body.
import type { CatalogField } from "./errors";
import { NAME_MAX_LENGTH, parseSortOrder, type FormIssues } from "./form";
import { isValidSlug } from "./slug";
import {
  isCourseIcon,
  isCourseTone,
  type AdminCourse,
  type CourseIcon,
  type CourseTone,
} from "./types";

export const CODE_MAX_LENGTH = 40;

// Strings while the Admin types. `icon` and `tone` are "" until chosen.
export type CourseValues = {
  slug: string;
  code: string;
  nameEn: string;
  nameAr: string;
  institutionId: string;
  icon: string;
  tone: string;
  sortOrder: string;
};

// What POST sends.
export type CourseCreateBody = {
  slug: string;
  code: string;
  nameEn: string;
  nameAr: string;
  institutionId: string;
  icon: CourseIcon;
  tone: CourseTone;
  sortOrder: number;
};

// What PATCH sends: only the changed fields. The backend refuses an unknown key and an empty body.
export type CourseChanges = Partial<CourseCreateBody>;

export function courseValues(course: AdminCourse): CourseValues {
  return {
    slug: course.slug,
    code: course.code,
    nameEn: course.name.en,
    nameAr: course.name.ar,
    institutionId: course.institution.id,
    icon: course.icon,
    tone: course.tone,
    sortOrder: String(course.sortOrder),
  };
}

export const EMPTY_COURSE_VALUES: CourseValues = {
  slug: "",
  code: "",
  nameEn: "",
  nameAr: "",
  institutionId: "",
  icon: "",
  tone: "",
  sortOrder: "0",
};

function textIssue(value: string, max: number): "required" | "tooLong" | null {
  const text = value.trim();
  if (text === "") return "required";
  return text.length > max ? "tooLong" : null;
}

// Checks that need no backend. Whether a slug is free or an Institution exists is the backend's to judge
// and comes back as a field error.
export function validateCourseForm(values: CourseValues): FormIssues {
  const issues: FormIssues = {};
  const slug = values.slug.trim();
  if (slug === "") issues.slug = "required";
  else if (!isValidSlug(slug)) issues.slug = "invalidId";

  const checks: [CatalogField, "required" | "tooLong" | null][] = [
    ["code", textIssue(values.code, CODE_MAX_LENGTH)],
    ["nameEn", textIssue(values.nameEn, NAME_MAX_LENGTH)],
    ["nameAr", textIssue(values.nameAr, NAME_MAX_LENGTH)],
  ];
  for (const [field, issue] of checks) if (issue) issues[field] = issue;

  if (!values.institutionId) issues.institutionId = "required";
  if (!isCourseIcon(values.icon)) issues.icon = "required";
  if (!isCourseTone(values.tone)) issues.tone = "required";
  if (parseSortOrder(values.sortOrder) === null) issues.sortOrder = "invalidSortOrder";
  return issues;
}

// The body of a create, or null when the form is not valid (run `validateCourseForm` first to say why).
export function courseCreateBody(values: CourseValues): CourseCreateBody | null {
  const sortOrder = parseSortOrder(values.sortOrder);
  if (sortOrder === null || !isCourseIcon(values.icon) || !isCourseTone(values.tone)) return null;
  return {
    slug: values.slug.trim(),
    code: values.code.trim(),
    nameEn: values.nameEn.trim(),
    nameAr: values.nameAr.trim(),
    institutionId: values.institutionId,
    icon: values.icon,
    tone: values.tone,
    sortOrder,
  };
}

// Only what changed, so an edit never sends (or audits) a field the Admin did not touch. Text compares
// trimmed. A field that does not parse is left out: `validateCourseForm` reports it before any send.
export function diffCourse(initial: CourseValues, current: CourseValues): CourseChanges {
  const changes: CourseChanges = {};
  const text = ["slug", "code", "nameEn", "nameAr"] as const;
  for (const field of text) {
    const next = current[field].trim();
    if (next !== initial[field].trim()) changes[field] = next;
  }
  if (current.institutionId !== initial.institutionId && current.institutionId !== "") {
    changes.institutionId = current.institutionId;
  }
  if (current.icon !== initial.icon && isCourseIcon(current.icon)) changes.icon = current.icon;
  if (current.tone !== initial.tone && isCourseTone(current.tone)) changes.tone = current.tone;
  const sortOrder = parseSortOrder(current.sortOrder);
  if (sortOrder !== null && sortOrder !== parseSortOrder(initial.sortOrder)) {
    changes.sortOrder = sortOrder;
  }
  return changes;
}

// A slug change breaks links (Student URLs use it), so it is confirmed before it is sent.
export function changesSlug(changes: CourseChanges): boolean {
  return changes.slug !== undefined;
}
