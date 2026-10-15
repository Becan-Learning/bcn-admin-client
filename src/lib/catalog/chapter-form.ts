// The Chapter forms (create and edit dialogs), as pure functions: what to validate, what to send. The
// components only hold state and call the backend. Numbers are strings while the Admin types.
import { NAME_MAX_LENGTH, type FormIssues } from "./form";
import type { AdminChapter } from "./types";

// The backend's bounds (`number` 1 to 10,000, `minutes` 1 to 1,000, `lessonCount` 0 to 1,000).
export const CHAPTER_NUMBER_MAX = 10_000;
export const CHAPTER_MINUTES_MAX = 1_000;
export const CHAPTER_LESSON_COUNT_MAX = 1_000;

export type ChapterValues = {
  titleEn: string;
  titleAr: string;
  minutes: string;
  lessonCount: string;
  // On create, blank means "the next free number". On edit it is never blank.
  number: string;
};

// What POST sends. `number` is left out when blank so the backend picks the next one.
export type ChapterCreateBody = {
  titleEn: string;
  titleAr: string;
  minutes: number;
  lessonCount: number;
  number?: number;
};

// What PATCH sends: only the changed fields. The backend refuses an unknown key and an empty body.
export type ChapterChanges = Partial<ChapterCreateBody>;

export const EMPTY_CHAPTER_VALUES: ChapterValues = {
  titleEn: "",
  titleAr: "",
  minutes: "",
  lessonCount: "0",
  number: "",
};

export function chapterValues(chapter: AdminChapter): ChapterValues {
  return {
    titleEn: chapter.title.en,
    titleAr: chapter.title.ar,
    minutes: String(chapter.minutes),
    lessonCount: String(chapter.lessonCount),
    number: String(chapter.number),
  };
}

// A whole number in [min, max], digits only: no decimals, signs or exponents.
function parseWhole(input: string, min: number, max: number): number | null {
  const text = input.trim();
  if (!/^\d{1,6}$/.test(text)) return null;
  const value = Number(text);
  return value >= min && value <= max ? value : null;
}

export const parseChapterNumber = (input: string) => parseWhole(input, 1, CHAPTER_NUMBER_MAX);
export const parseMinutes = (input: string) => parseWhole(input, 1, CHAPTER_MINUTES_MAX);
export const parseLessonCount = (input: string) => parseWhole(input, 0, CHAPTER_LESSON_COUNT_MAX);

function titleIssue(value: string): "required" | "tooLong" | null {
  const text = value.trim();
  if (text === "") return "required";
  return text.length > NAME_MAX_LENGTH ? "tooLong" : null;
}

// Checks that need no backend. Whether a number is free is the backend's to judge and comes back as a field
// error. A blank number is valid on a create (the next free one) and not on an edit.
export function validateChapterForm(values: ChapterValues, mode: "create" | "edit"): FormIssues {
  const issues: FormIssues = {};
  const titleEn = titleIssue(values.titleEn);
  if (titleEn) issues.titleEn = titleEn;
  const titleAr = titleIssue(values.titleAr);
  if (titleAr) issues.titleAr = titleAr;
  if (parseMinutes(values.minutes) === null) issues.minutes = "invalidMinutes";
  if (parseLessonCount(values.lessonCount) === null) issues.lessonCount = "invalidLessonCount";
  const blankNumber = values.number.trim() === "";
  if (!(mode === "create" && blankNumber) && parseChapterNumber(values.number) === null) {
    issues.number = "invalidNumber";
  }
  return issues;
}

// The body of a create, or null when the form is not valid (run `validateChapterForm` first to say why).
export function chapterCreateBody(values: ChapterValues): ChapterCreateBody | null {
  const minutes = parseMinutes(values.minutes);
  const lessonCount = parseLessonCount(values.lessonCount);
  if (minutes === null || lessonCount === null) return null;
  const body: ChapterCreateBody = {
    titleEn: values.titleEn.trim(),
    titleAr: values.titleAr.trim(),
    minutes,
    lessonCount,
  };
  if (values.number.trim() !== "") {
    const number = parseChapterNumber(values.number);
    if (number === null) return null;
    body.number = number;
  }
  return body;
}

// Only what changed, so an edit never sends (or audits) a field the Admin did not touch. Titles compare
// trimmed. A field that does not parse is left out: `validateChapterForm` reports it before any send.
export function diffChapter(initial: ChapterValues, current: ChapterValues): ChapterChanges {
  const changes: ChapterChanges = {};
  const titleEn = current.titleEn.trim();
  const titleAr = current.titleAr.trim();
  if (titleEn !== initial.titleEn.trim()) changes.titleEn = titleEn;
  if (titleAr !== initial.titleAr.trim()) changes.titleAr = titleAr;
  const numbers = [
    ["minutes", parseMinutes],
    ["lessonCount", parseLessonCount],
    ["number", parseChapterNumber],
  ] as const;
  for (const [field, parse] of numbers) {
    const next = parse(current[field]);
    if (next !== null && next !== parse(initial[field])) changes[field] = next;
  }
  return changes;
}

