"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDownIcon, GripVerticalIcon, PlusIcon } from "lucide-react";
import { FormError } from "@/components/auth/form-error";
import { useAccountAction } from "@/components/accounts/detail/use-account-action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { reorderChapters } from "@/lib/catalog/api";
import {
  chapterStateMoves,
  effectiveOrder,
  groupChapters,
  moveBy,
  moveToId,
  orderChanged,
  orderToSave,
  plannedNumbers,
  type ChapterStateMove,
} from "@/lib/catalog/chapter-rules";
import type { AdminChapter, AdminCourse, ChapterState } from "@/lib/catalog/types";
import { ChapterDeleteDialog } from "./chapter-delete-dialog";
import { ChapterDialog } from "./chapter-dialog";
import { ChapterReplaceDialog } from "./chapter-replace-dialog";
import { ChapterRow, type RowActions } from "./chapter-row";
import { ChapterStateDialog } from "./chapter-state-dialog";

// Only one dialog is open at a time. It holds the Chapter as it was when the Admin opened it, so a refresh
// that removes the Chapter (delete, replace) does not blank the dialog before it closes.
type DialogTarget =
  | { kind: "create" }
  | { kind: "edit"; chapter: AdminChapter }
  | { kind: "state"; chapter: AdminChapter; move: ChapterStateMove }
  | { kind: "replace"; chapter: AdminChapter }
  | { kind: "delete"; chapter: AdminChapter };

// The Chapters of a Course: the numbered list (Coming soon and Published) that can be reordered, then the
// Drafts, then the Archived ones. The Admin arranges the numbered list locally (drag, or Move up and Move
// down in the row's menu); Save order sends the full list once, Reset goes back to the server's order. A
// failed save restores the server's order and shows the error.
export function ChaptersCard({ course, chapters }: { course: AdminCourse; chapters: AdminChapter[] }) {
  const t = useTranslations("CourseDetail.chapters");
  const order = useTranslations("CourseDetail.chapters.order");
  const router = useRouter();
  const saveAction = useAccountAction();
  const [dialog, setDialog] = useState<DialogTarget | null>(null);

  const groups = groupChapters(chapters);
  const serverOrder = groups.numbered.map((chapter) => chapter.id);

  // The Admin's arrangement. When the server's list changes (a save landed, an edit changed a number), the
  // arrangement is dropped so the page never shows a stale one.
  const serverKey = serverOrder.join(",");
  const [seenKey, setSeenKey] = useState(serverKey);
  const [local, setLocal] = useState<string[] | null>(null);
  if (seenKey !== serverKey) {
    setSeenKey(serverKey);
    setLocal(null);
  }
  const currentOrder = effectiveOrder(local, serverOrder);
  const dirty = orderChanged(serverOrder, currentOrder);
  const planned = plannedNumbers(currentOrder);
  const byId = new Map(groups.numbered.map((chapter) => [chapter.id, chapter]));
  const numbered = currentOrder.flatMap((id) => byId.get(id) ?? []);
  const locked = dirty || saveAction.pending;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Opening a dialog clears the last save error, which was about an earlier action.
  function openDialog(target: DialogTarget) {
    saveAction.reset();
    setDialog(target);
  }

  function arrange(next: string[]) {
    saveAction.reset();
    setLocal(next);
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) arrange(moveToId(currentOrder, String(active.id), String(over.id)));
  }

  async function save() {
    const ids = orderToSave(serverOrder, currentOrder);
    if (!ids) return;
    const result = await saveAction.run(() => reorderChapters(course.id, ids), order("saved"));
    if (!result.ok) {
      // Back to the server's order. If the Course's Chapters changed under us, load the current list too.
      setLocal(null);
      if (result.errorKey === "CHAPTER_ORDER_MISMATCH" || result.errorKey === "COURSE_NOT_FOUND") {
        router.refresh();
      }
    }
  }

  function actionsFor(chapter: AdminChapter, moves: ChapterStateMove[], index?: number): RowActions {
    return {
      onEdit: () => openDialog({ kind: "edit", chapter }),
      onMove: (to: ChapterState) => {
        const move = moves.find((item) => item.to === to);
        if (move) openDialog({ kind: "state", chapter, move });
      },
      onReplace: () => openDialog({ kind: "replace", chapter }),
      onDelete: () => openDialog({ kind: "delete", chapter }),
      ...(index === undefined
        ? {}
        : {
            onMoveUp: () => arrange(moveBy(currentOrder, chapter.id, -1)),
            onMoveDown: () => arrange(moveBy(currentOrder, chapter.id, 1)),
          }),
    };
  }

  const close = () => setDialog(null);
  const empty = chapters.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div>
          <Button type="button" variant="outline" disabled={saveAction.pending} onClick={() => openDialog({ kind: "create" })}>
            <PlusIcon aria-hidden />
            {t("add")}
          </Button>
        </div>

        <FormError errorKey={saveAction.errorKey} />

        {empty ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <>
            <section aria-labelledby="chapters-numbered" className="flex flex-col gap-3">
              <h3 id="chapters-numbered" className="text-sm font-medium">
                {t("groups.numbered")} <span className="text-muted-foreground">({numbered.length})</span>
              </h3>
              {dirty ? (
                <div className="flex flex-col gap-3 rounded-lg border border-dashed p-3 sm:flex-row sm:items-center sm:justify-between">
                  <p role="status" className="text-sm">
                    {order("changed")} <span className="text-muted-foreground">{order("locked")}</span>
                  </p>
                  <div className="flex shrink-0 gap-2">
                    <Button type="button" disabled={saveAction.pending} onClick={() => void save()}>
                      {saveAction.pending ? order("saving") : order("save")}
                    </Button>
                    <Button type="button" variant="outline" disabled={saveAction.pending} onClick={() => setLocal(null)}>
                      {order("reset")}
                    </Button>
                  </div>
                </div>
              ) : saveAction.done ? (
                <p role="status" className="text-sm text-muted-foreground">
                  {saveAction.done}
                </p>
              ) : null}
              {numbered.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("groups.numberedEmpty")}</p>
              ) : (
                <DndContext
                  id="chapters-order"
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  accessibility={{ screenReaderInstructions: { draggable: order("instructions") } }}
                  onDragEnd={onDragEnd}
                >
                  <SortableContext items={currentOrder} strategy={verticalListSortingStrategy}>
                    <ul className="flex flex-col gap-2">
                      {numbered.map((chapter, index) => (
                        <SortableChapterRow
                          key={chapter.id}
                          chapter={chapter}
                          moves={chapterStateMoves(chapter, chapters, course)}
                          actionsFor={actionsFor}
                          locked={locked}
                          plannedNumber={planned.get(chapter.id)}
                          position={{ index, count: numbered.length }}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>
              )}
            </section>

            {groups.drafts.length > 0 ? (
              <section aria-labelledby="chapters-drafts" className="flex flex-col gap-3">
                <h3 id="chapters-drafts" className="text-sm font-medium">
                  {t("groups.drafts")} <span className="text-muted-foreground">({groups.drafts.length})</span>
                </h3>
                <ul className="flex flex-col gap-2">
                  {groups.drafts.map((chapter) => (
                    <ChapterRow
                      key={chapter.id}
                      chapter={chapter}
                      moves={chapterStateMoves(chapter, chapters, course)}
                      actions={actionsFor(chapter, chapterStateMoves(chapter, chapters, course))}
                      locked={locked}
                    />
                  ))}
                </ul>
              </section>
            ) : null}

            {groups.archived.length > 0 ? (
              <Collapsible className="flex flex-col gap-3">
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="group w-fit -ms-2.5">
                    <ChevronDownIcon aria-hidden className="transition-transform group-aria-expanded:rotate-180" />
                    {t("groups.archived")} ({groups.archived.length})
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ul className="flex flex-col gap-2">
                    {groups.archived.map((chapter) => (
                      <ChapterRow
                        key={chapter.id}
                        chapter={chapter}
                        moves={chapterStateMoves(chapter, chapters, course)}
                        actions={actionsFor(chapter, chapterStateMoves(chapter, chapters, course))}
                        locked={locked}
                      />
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            ) : null}
          </>
        )}
      </CardContent>

      {dialog?.kind === "create" || dialog?.kind === "edit" ? (
        <ChapterDialog
          chapter={dialog.kind === "edit" ? dialog.chapter : null}
          chapters={chapters}
          courseId={course.id}
          onClose={close}
        />
      ) : null}
      {dialog?.kind === "state" ? (
        <ChapterStateDialog chapter={dialog.chapter} move={dialog.move} onClose={close} />
      ) : null}
      {dialog?.kind === "replace" ? (
        <ChapterReplaceDialog chapter={dialog.chapter} chapters={chapters} course={course} onClose={close} />
      ) : null}
      {dialog?.kind === "delete" ? <ChapterDeleteDialog chapter={dialog.chapter} onClose={close} /> : null}
    </Card>
  );
}

function SortableChapterRow({
  chapter,
  moves,
  actionsFor,
  locked,
  plannedNumber,
  position,
}: {
  chapter: AdminChapter;
  moves: ChapterStateMove[];
  actionsFor: (chapter: AdminChapter, moves: ChapterStateMove[], index?: number) => RowActions;
  locked: boolean;
  plannedNumber: number | undefined;
  position: { index: number; count: number };
}) {
  const order = useTranslations("CourseDetail.chapters.order");
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: chapter.id });
  return (
    <ChapterRow
      chapter={chapter}
      moves={moves}
      actions={actionsFor(chapter, moves, position.index)}
      locked={locked}
      plannedNumber={plannedNumber}
      position={position}
      sortable={{
        setNodeRef,
        style: { transform: CSS.Transform.toString(transform), transition },
        dragging: isDragging,
        handle: (
          <Button
            ref={setActivatorNodeRef}
            type="button"
            variant="ghost"
            size="icon-sm"
            className="-ms-1 shrink-0 cursor-grab touch-none active:cursor-grabbing"
            aria-label={order("handle", { title: chapter.title.en })}
            {...attributes}
            {...listeners}
          >
            <GripVerticalIcon aria-hidden />
          </Button>
        ),
      }}
    />
  );
}
