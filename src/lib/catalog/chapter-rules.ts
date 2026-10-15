// What an Admin may do to a Course's Chapters, as pure functions: grouping, the order the Admin arranges,
// the state moves, the publish preconditions, the replacement candidates and the delete blockers. The
// backend decides in the end (409 `CHAPTER_NUMBER_TAKEN`, `PUBLISH_PRECONDITION`, `REPLACEMENT_INVALID`,
// `CHAPTER_ORDER_MISMATCH`, `CHAPTER_IN_USE`); these only keep the buttons honest and the reasons exact.
import { CHAPTER_STATES, type AdminChapter, type AdminCourse, type ChapterState } from "./types";

// Only Coming soon and Published Chapters have a number that is unique within the Course, and only they
// are reordered. Drafts and Archived Chapters keep whatever number they had.
export function isNumbered(state: ChapterState): boolean {
  return state === "coming_soon" || state === "published";
}

export type ChapterGroups = {
  numbered: AdminChapter[];
  drafts: AdminChapter[];
  archived: AdminChapter[];
};

function byNumber(a: AdminChapter, b: AdminChapter): number {
  return a.number - b.number || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
}

// Coming soon and Published Chapters by number first, then Drafts, then Archived ones, each by number (a
// Draft or an Archived Chapter may share a number with a live one, so ties go by creation time).
export function groupChapters(chapters: AdminChapter[]): ChapterGroups {
  const groups: ChapterGroups = { numbered: [], drafts: [], archived: [] };
  for (const chapter of chapters) {
    if (isNumbered(chapter.state)) groups.numbered.push(chapter);
    else if (chapter.state === "draft") groups.drafts.push(chapter);
    else groups.archived.push(chapter);
  }
  groups.numbered.sort(byNumber);
  groups.drafts.sort(byNumber);
  groups.archived.sort(byNumber);
  return groups;
}

// The number a new Chapter gets when the Admin gives none: one after the highest Coming soon or Published
// number, or 1 for a Course with none.
export function nextChapterNumber(chapters: Pick<AdminChapter, "number" | "state">[]): number {
  let highest = 0;
  for (const chapter of chapters) {
    if (isNumbered(chapter.state) && chapter.number > highest) highest = chapter.number;
  }
  return highest + 1;
}

// ---------------------------------------------------------------------------------------------------------
// Reorder. The Admin arranges a list of ids locally, then saves it once as the full ordered list.

// The Chapter `activeId` moves to where `overId` is (drag and drop). An unknown id changes nothing.
export function moveToId(ids: string[], activeId: string, overId: string): string[] {
  const from = ids.indexOf(activeId);
  const to = ids.indexOf(overId);
  if (from === -1 || to === -1 || from === to) return ids;
  const next = ids.slice();
  next.splice(from, 1);
  next.splice(to, 0, activeId);
  return next;
}

// One step up (-1) or down (+1): the keyboard and touch alternative to dragging. At either end it changes
// nothing.
export function moveBy(ids: string[], id: string, delta: -1 | 1): string[] {
  const from = ids.indexOf(id);
  const to = from + delta;
  if (from === -1 || to < 0 || to >= ids.length) return ids;
  const next = ids.slice();
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return set.size === a.length && b.every((id) => set.has(id));
}

// The order to show: the Admin's arrangement while it is still about the same Chapters as the server's list,
// else the server's. A Chapter that left or joined the numbered group (another Admin, a state change)
// drops a stale arrangement instead of sending it.
export function effectiveOrder(local: string[] | null, server: string[]): string[] {
  return local !== null && sameSet(local, server) ? local : server;
}

export function orderChanged(server: string[], order: string[]): boolean {
  return server.length === order.length && order.some((id, index) => id !== server[index]);
}

// The body of the save: the full ordered list, or null when nothing changed (the backend would write
// nothing either, so Save stays off).
export function orderToSave(server: string[], order: string[]): string[] | null {
  return orderChanged(server, order) ? order : null;
}

// What each Chapter's number becomes on save: 1..n in list order (the backend closes gaps).
export function plannedNumbers(order: string[]): Map<string, number> {
  return new Map(order.map((id, index) => [id, index + 1]));
}

// ---------------------------------------------------------------------------------------------------------
// States and preconditions

// Published needs a live Chapter content version AND a live Course content version. Missing parts, in the
// order the backend reports them (the Chapter first).
export type PublishBlocker = "chapterContent" | "courseContent";

export function publishBlockers(
  chapter: Pick<AdminChapter, "liveContentVersionId">,
  course: Pick<AdminCourse, "liveContentVersionId">,
): PublishBlocker[] {
  const blockers: PublishBlocker[] = [];
  if (chapter.liveContentVersionId === null) blockers.push("chapterContent");
  if (course.liveContentVersionId === null) blockers.push("courseContent");
  return blockers;
}

// Why a move is off. `numberTaken`: going Coming soon or Published needs the number free among the Course's
// Coming soon and Published Chapters (the backend checks this first). The other two are the publish rule.
export type StateMoveBlocker = "numberTaken" | PublishBlocker;

export type ChapterStateMove = { to: ChapterState; blockers: StateMoveBlocker[] };

// Every state except the current one, in Draft, Coming soon, Published, Archived order: any state can go to
// any other. A move with blockers is shown but off, with the reasons.
export function chapterStateMoves(
  chapter: AdminChapter,
  chapters: Pick<AdminChapter, "id" | "number" | "state">[],
  course: Pick<AdminCourse, "liveContentVersionId">,
): ChapterStateMove[] {
  const numberHeld = chapters.some(
    (other) => other.id !== chapter.id && isNumbered(other.state) && other.number === chapter.number,
  );
  return CHAPTER_STATES.filter((to) => to !== chapter.state).map((to) => {
    const blockers: StateMoveBlocker[] = [];
    if (isNumbered(to) && numberHeld) blockers.push("numberTaken");
    if (to === "published") blockers.push(...publishBlockers(chapter, course));
    return { to, blockers };
  });
}

// ---------------------------------------------------------------------------------------------------------
// Replacement

// Only a Coming soon or Published Chapter can be replaced.
export function canReplace(chapter: Pick<AdminChapter, "state">): boolean {
  return isNumbered(chapter.state);
}

export type ReplacementCandidate = { chapter: AdminChapter; blockers: PublishBlocker[] };

// The Course's Drafts, each with what stops it taking over `old`. The Draft must meet the content rules of
// the state it takes: Published needs both live versions, Coming soon needs none.
export function replacementCandidates(
  old: AdminChapter,
  chapters: AdminChapter[],
  course: Pick<AdminCourse, "liveContentVersionId">,
): ReplacementCandidate[] {
  if (!canReplace(old)) return [];
  return chapters
    .filter((chapter) => chapter.state === "draft" && chapter.courseId === old.courseId && chapter.id !== old.id)
    .sort(byNumber)
    .map((chapter) => ({
      chapter,
      blockers: old.state === "published" ? publishBlockers(chapter, course) : [],
    }));
}

// ---------------------------------------------------------------------------------------------------------
// Delete

// Why a Chapter cannot be deleted, for the line that points to Archive. The backend's rule is: no Session
// ever, and no Content version ever live or uploaded to Bunny. The Session count names the first; the
// version rule has no count of its own, so it is named only when it must be the reason.
export type ChapterDeleteBlocker = "sessions" | "contentVersions";

export function chapterDeleteBlockers(
  chapter: Pick<AdminChapter, "counts" | "deletable">,
): ChapterDeleteBlocker[] {
  if (chapter.deletable) return [];
  return chapter.counts.sessions > 0 ? ["sessions"] : ["contentVersions"];
}

export function hasLiveContent(chapter: Pick<AdminChapter, "liveContentVersionId">): boolean {
  return chapter.liveContentVersionId !== null;
}
