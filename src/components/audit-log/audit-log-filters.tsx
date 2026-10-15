"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AUDIT_ACTIONS, isAuditAction } from "@/lib/audit-log/actions";
import { actionLabelKey } from "@/lib/audit-log/labels";
import { hasActiveFilters, type AuditFilters } from "@/lib/audit-log/filters";
import type { AdminActors } from "./use-admin-actors";

// Radix Select cannot hold an empty value, so "any" has its own.
const ANY = "__any__";

type Draft = Omit<AuditFilters, "page">;

// The parent remounts this component whenever the URL's filters change, so the draft always starts
// from what the URL says (including after the browser's back button).
export function AuditLogFilters({
  filters,
  actors,
  onApply,
}: {
  filters: AuditFilters;
  actors: AdminActors;
  onApply: (filters: Draft) => void;
}) {
  const t = useTranslations("AuditLog.filters");
  const actionNames = useTranslations("AuditLog.actions");
  const [draft, setDraft] = useState<Draft>({
    action: filters.action,
    actorId: filters.actorId,
    targetId: filters.targetId,
    from: filters.from,
    to: filters.to,
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onApply({
      ...draft,
      targetId: draft.targetId?.trim() || undefined,
    });
  }

  const knownActors = actors.status === "ready" ? actors.actors : [];
  // An Admin who is not in the list (removed, or past the first 100) can still be the filter.
  const selectedMissing =
    draft.actorId !== undefined && !knownActors.some((actor) => actor.id === draft.actorId);

  return (
    <form
      onSubmit={submit}
      aria-label={t("label")}
      className="flex flex-col gap-4 rounded-lg border p-4"
    >
      <FieldGroup className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Field>
          <FieldLabel htmlFor="audit-action">{t("action")}</FieldLabel>
          <Select
            value={draft.action ?? ANY}
            onValueChange={(value) =>
              setDraft((d) => ({ ...d, action: value !== ANY && isAuditAction(value) ? value : undefined }))
            }
          >
            <SelectTrigger id="audit-action" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>{t("anyAction")}</SelectItem>
              {AUDIT_ACTIONS.map((action) => {
                const labelKey = actionLabelKey(action);
                return (
                  <SelectItem key={action} value={action}>
                    {labelKey ? actionNames(labelKey) : action}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="audit-actor">{t("actor")}</FieldLabel>
          <Select
            value={draft.actorId ?? ANY}
            onValueChange={(value) =>
              setDraft((d) => ({ ...d, actorId: value === ANY ? undefined : value }))
            }
            disabled={actors.status === "loading"}
          >
            <SelectTrigger id="audit-actor" className="w-full">
              <SelectValue placeholder={actors.status === "loading" ? t("actorsLoading") : undefined} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>{t("anyActor")}</SelectItem>
              {selectedMissing && draft.actorId ? (
                <SelectItem value={draft.actorId}>
                  <span dir="auto">{t("unknownActor", { id: draft.actorId })}</span>
                </SelectItem>
              ) : null}
              {knownActors.map((actor) => (
                <SelectItem key={actor.id} value={actor.id}>
                  <span dir="auto">{actor.name}</span>
                  <span className="text-muted-foreground" dir="auto">
                    {actor.email}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {actors.status === "failed" ? (
            <FieldDescription role="status">{t("actorsFailed")}</FieldDescription>
          ) : null}
        </Field>

        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="audit-target">{t("targetId")}</FieldLabel>
          <Input
            id="audit-target"
            dir="ltr"
            value={draft.targetId ?? ""}
            placeholder={t("targetIdPlaceholder")}
            maxLength={200}
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
            onChange={(event) => setDraft((d) => ({ ...d, targetId: event.target.value }))}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="audit-from">{t("from")}</FieldLabel>
          <Input
            id="audit-from"
            type="date"
            value={draft.from ?? ""}
            max={draft.to}
            onChange={(event) => setDraft((d) => ({ ...d, from: event.target.value || undefined }))}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="audit-to">{t("to")}</FieldLabel>
          <Input
            id="audit-to"
            type="date"
            value={draft.to ?? ""}
            min={draft.from}
            onChange={(event) => setDraft((d) => ({ ...d, to: event.target.value || undefined }))}
          />
        </Field>
        <FieldDescription className="sm:col-span-2 xl:self-end">{t("dateHelp")}</FieldDescription>
      </FieldGroup>

      <div className="flex flex-wrap gap-2">
        <Button type="submit">{t("apply")}</Button>
        <Button
          type="button"
          variant="outline"
          disabled={!hasActiveFilters({ page: 1, ...draft })}
          onClick={() => onApply({})}
        >
          {t("clear")}
        </Button>
      </div>
    </form>
  );
}
