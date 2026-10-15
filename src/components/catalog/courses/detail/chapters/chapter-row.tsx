"use client";

import type { CSSProperties, ReactNode, Ref } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  MoreHorizontalIcon,
  PencilIcon,
  ReplaceIcon,
  Trash2Icon,
} from "lucide-react";
import { ChapterStateBadge } from "@/components/catalog/chapter-state-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  canReplace,
  chapterDeleteBlockers,
  hasLiveContent,
  type ChapterStateMove,
} from "@/lib/catalog/chapter-rules";
import type { AdminChapter, ChapterState } from "@/lib/catalog/types";

export type RowActions = {
  onEdit: () => void;
  onMove: (to: ChapterState) => void;
  onReplace: () => void;
  onDelete: () => void;
  // Only for a row in the numbered list.
  onMoveUp?: () => void;
  onMoveDown?: () => void;
};

// What a numbered row gets from dnd-kit: its own ref and style, whether it is being dragged, and the drag
// handle (built where the sortable hook runs).
export type SortableProps = {
  setNodeRef: Ref<HTMLLIElement>;
  style: CSSProperties;
  dragging: boolean;
  handle: ReactNode;
};

// One Chapter: number, titles (Arabic isolated in <bdi>), minutes, lessons, whether live content exists,
// the state badge and an actions menu. A numbered row also has the drag handle and, in the menu, Move up
// and Move down (the keyboard and touch alternative). `plannedNumber` is what the number becomes if the
// Admin saves the order they arranged.
export function ChapterRow({
  chapter,
  moves,
  actions,
  locked,
  plannedNumber,
  position,
  sortable,
}: {
  chapter: AdminChapter;
  moves: ChapterStateMove[];
  actions: RowActions;
  // The Admin has an unsaved order: every action but Move up and Move down waits until it is saved or reset.
  locked: boolean;
  plannedNumber?: number;
  // 0-based index and count of the numbered list, to switch Move up/down off at the ends.
  position?: { index: number; count: number };
  sortable?: SortableProps;
}) {
  const t = useTranslations("CourseDetail.chapters.row");
  const states = useTranslations("Catalog.chapterState");
  const title = chapter.title.en;
  const deleteBlockers = chapterDeleteBlockers(chapter);
  const numberChanges = plannedNumber !== undefined && plannedNumber !== chapter.number;

  return (
    <li
      ref={sortable?.setNodeRef}
      style={sortable?.style}
      className={cn(
        "flex items-start gap-2 rounded-lg border bg-card p-3 text-card-foreground",
        sortable?.dragging && "relative z-10 shadow-lg ring-2 ring-ring/40",
      )}
    >
      {sortable?.handle}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono text-sm text-muted-foreground tabular-nums" dir="ltr">
            {t("chapterNumber", { number: chapter.number })}
          </span>
          {numberChanges ? (
            <span className="text-xs font-medium text-foreground tabular-nums">
              {t("willBecome", { number: plannedNumber })}
            </span>
          ) : null}
          <ChapterStateBadge state={chapter.state} />
        </div>
        <Link
          href={`/catalog/chapters/${encodeURIComponent(chapter.id)}`}
          className="w-fit max-w-full font-medium break-words underline-offset-4 hover:underline"
        >
          <bdi>{title}</bdi>
        </Link>
        <p lang="ar" className="text-sm break-words text-muted-foreground">
          <bdi>{chapter.title.ar}</bdi>
        </p>
        <p className="text-xs text-muted-foreground">
          {t("minutes", { minutes: chapter.minutes })}
          <span aria-hidden> · </span>
          {t("lessons", { count: chapter.lessonCount })}
          <span aria-hidden> · </span>
          <span className={hasLiveContent(chapter) ? "text-foreground" : undefined}>
            {hasLiveContent(chapter) ? t("contentLive") : t("contentNone")}
          </span>
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="-me-1 shrink-0"
            aria-label={t("actions", { title })}
            disabled={locked && !actions.onMoveUp}
          >
            <MoreHorizontalIcon aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuItem asChild>
            <Link href={`/catalog/chapters/${encodeURIComponent(chapter.id)}`}>{t("content")}</Link>
          </DropdownMenuItem>
          <DropdownMenuItem disabled={locked} onSelect={actions.onEdit}>
            <PencilIcon aria-hidden />
            {t("edit")}
          </DropdownMenuItem>
          {actions.onMoveUp && position ? (
            <>
              <DropdownMenuItem disabled={position.index === 0} onSelect={actions.onMoveUp}>
                <ArrowUpIcon aria-hidden />
                {t("moveUp")}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={position.index === position.count - 1}
                onSelect={actions.onMoveDown}
              >
                <ArrowDownIcon aria-hidden />
                {t("moveDown")}
              </DropdownMenuItem>
            </>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">{t("stateLabel")}</DropdownMenuLabel>
          {moves.map((move) => (
            <DropdownMenuItem
              key={move.to}
              disabled={locked}
              className={move.blockers.length > 0 ? "text-muted-foreground" : undefined}
              onSelect={() => actions.onMove(move.to)}
            >
              {t("moveTo", { state: states(move.to) })}
              {move.blockers.length > 0 ? (
                <span className="ms-auto text-xs">{t("unavailable")}</span>
              ) : null}
            </DropdownMenuItem>
          ))}
          {canReplace(chapter) ? (
            <DropdownMenuItem disabled={locked} onSelect={actions.onReplace}>
              <ReplaceIcon aria-hidden />
              {t("replace")}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          {chapter.deletable ? (
            <DropdownMenuItem variant="destructive" disabled={locked} onSelect={actions.onDelete}>
              <Trash2Icon aria-hidden />
              {t("delete")}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuLabel className="max-w-64 text-xs font-normal text-wrap text-muted-foreground">
              {t("deleteBlocked", { reason: t(`deleteBlockers.${deleteBlockers[0] ?? "contentVersions"}`) })}
            </DropdownMenuLabel>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
