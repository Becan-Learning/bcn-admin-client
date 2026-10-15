"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertCircleIcon, BookOpenIcon, PlusIcon, SearchXIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  coursesHref,
  DEFAULT_COURSES_STATE,
  hasActiveCourseFilters,
  type CoursesQueryState,
} from "@/lib/catalog/course-query-state";
import type { CoursesResult } from "@/lib/catalog/fetch";
import type { AdminInstitution } from "@/lib/catalog/types";
import { CourseDialog } from "./course-dialog";
import { CoursesTable } from "./courses-table";
import { CoursesToolbar } from "./courses-toolbar";

// The URL is the only list state. Every change here is a navigation to the same page with new search
// params; the server component above re-fetches. Wrapped in a transition, the old rows stay on screen
// (dimmed) until the new ones arrive, instead of flashing back to the skeleton. `institutions` is null
// when they could not be loaded: the list still works, the filter and the Add dialog have no options.
export function CoursesView({
  state,
  institutions,
  result,
}: {
  state: CoursesQueryState;
  institutions: AdminInstitution[] | null;
  result: CoursesResult;
}) {
  const t = useTranslations("Catalog.courses");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);

  const go = useCallback(
    (next: CoursesQueryState, mode: "push" | "replace" = "push") => {
      startTransition(() => router[mode](coursesHref(next), { scroll: false }));
    },
    [router],
  );
  const clear = () => go(DEFAULT_COURSES_STATE);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex">
        <Button onClick={() => setAdding(true)}>
          <PlusIcon aria-hidden />
          {t("add")}
        </Button>
      </div>

      <CoursesToolbar state={state} institutions={institutions ?? []} onChange={go} onClear={clear} />

      <div aria-busy={pending} className={pending ? "opacity-60 transition-opacity" : undefined}>
        {!result.ok ? (
          <ErrorPanel errorKey={result.errorKey} onRetry={() => startTransition(() => router.refresh())} />
        ) : result.courses.length === 0 ? (
          <EmptyPanel filtered={hasActiveCourseFilters(state)} onClear={clear} />
        ) : (
          <div className="flex flex-col gap-3">
            <CoursesTable courses={result.courses} />
            <p className="text-sm text-muted-foreground">{t("summary", { total: result.courses.length })}</p>
          </div>
        )}
      </div>

      {adding ? (
        <CourseDialog
          open
          institutions={institutions}
          defaultInstitutionId={state.institutionId}
          onOpenChange={(open) => {
            if (!open) setAdding(false);
          }}
        />
      ) : null}
    </div>
  );
}

function ErrorPanel({
  errorKey,
  onRetry,
}: {
  errorKey: Extract<CoursesResult, { ok: false }>["errorKey"];
  onRetry: () => void;
}) {
  const t = useTranslations("Catalog.courses");
  const errors = useTranslations("Errors");
  const common = useTranslations("Common");
  return (
    <Alert variant="destructive" role="alert">
      <AlertCircleIcon />
      <AlertTitle>{t("errorTitle")}</AlertTitle>
      <AlertDescription>
        <p>{errors(errorKey)}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          {common("tryAgain")}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function EmptyPanel({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  const t = useTranslations("Catalog.courses");
  const Icon = filtered ? SearchXIcon : BookOpenIcon;
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed px-6 py-12 text-center">
      <Icon aria-hidden className="size-8 text-muted-foreground" />
      <p className="font-medium">{filtered ? t("noMatchesTitle") : t("emptyTitle")}</p>
      <p className="text-sm text-muted-foreground">
        {filtered ? t("noMatchesDescription") : t("emptyDescription")}
      </p>
      {filtered ? (
        <Button variant="outline" size="sm" onClick={onClear}>
          {t("clearFilters")}
        </Button>
      ) : null}
    </div>
  );
}
