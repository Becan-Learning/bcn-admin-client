"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertCircleIcon, LandmarkIcon, PlusIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { InstitutionsResult } from "@/lib/catalog/fetch";
import type { AdminInstitution, AdminMajor, InstitutionWithMajors } from "@/lib/catalog/types";
import { InstitutionCard } from "./institution-card";
import { InstitutionDialog } from "./institution-dialog";
import { MajorDialog } from "./major-dialog";

// Which dialog is open. One at a time; `null` for the Institution or Major means "create".
type DialogState =
  | { kind: "institution"; institution: AdminInstitution | null }
  | { kind: "major"; institutionId: string; major: AdminMajor | null };

// The Institutions and Majors page: the server component fetched everything, this draws it and opens
// the create and edit dialogs. Writes run in the browser and end with `router.refresh()`, which
// re-runs the server fetch, so there is no list state to keep in step here.
export function InstitutionsView({ result }: { result: InstitutionsResult }) {
  const t = useTranslations("Catalog.institutions");
  const [dialog, setDialog] = useState<DialogState | null>(null);

  if (!result.ok) return <ErrorPanel errorKey={result.errorKey} />;

  const institutions: InstitutionWithMajors[] = result.institutions;
  const close = (open: boolean) => {
    if (!open) setDialog(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex">
        <Button onClick={() => setDialog({ kind: "institution", institution: null })}>
          <PlusIcon aria-hidden />
          {t("add")}
        </Button>
      </div>

      {institutions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed px-6 py-12 text-center">
          <LandmarkIcon aria-hidden className="size-8 text-muted-foreground" />
          <p className="font-medium">{t("emptyTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("emptyDescription")}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {institutions.map((institution) => (
            <li key={institution.id}>
              <InstitutionCard
                institution={institution}
                onEditInstitution={() => setDialog({ kind: "institution", institution })}
                onAddMajor={() =>
                  setDialog({ kind: "major", institutionId: institution.id, major: null })
                }
                onEditMajor={(major) =>
                  setDialog({ kind: "major", institutionId: institution.id, major })
                }
              />
            </li>
          ))}
        </ul>
      )}

      {dialog?.kind === "institution" ? (
        <InstitutionDialog open institution={dialog.institution} onOpenChange={close} />
      ) : null}
      {dialog?.kind === "major" ? (
        <MajorDialog
          open
          major={dialog.major}
          institutionId={dialog.institutionId}
          institutions={institutions}
          onOpenChange={close}
        />
      ) : null}
    </div>
  );
}

function ErrorPanel({ errorKey }: { errorKey: Extract<InstitutionsResult, { ok: false }>["errorKey"] }) {
  const t = useTranslations("Catalog.institutions");
  const errors = useTranslations("Errors");
  const common = useTranslations("Common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Alert variant="destructive" role="alert">
      <AlertCircleIcon />
      <AlertTitle>{t("errorTitle")}</AlertTitle>
      <AlertDescription>
        <p>{errors(errorKey)}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          disabled={pending}
          onClick={() => startTransition(() => router.refresh())}
        >
          {common("tryAgain")}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
