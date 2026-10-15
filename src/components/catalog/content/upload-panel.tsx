"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FileArchiveIcon, FolderUpIcon, XIcon } from "lucide-react";
import { FormError } from "@/components/auth/form-error";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { AuthErrorKey } from "@/lib/auth/errors";
import { uploadContent } from "@/lib/content/api";
import { folderName, isZipName, planFolder, zipFolder, type FolderPlan } from "@/lib/content/folder-zip";
import { formatBytes } from "@/lib/content/rules";
import type { ContentOwnerKind, ContentVersion } from "@/lib/content/types";

// What the Admin picked, waiting for Upload.
type Picked =
  | { kind: "folder"; name: string; plan: FolderPlan<File> }
  | { kind: "zip"; name: string; file: File };

type Phase =
  | { step: "idle" }
  | { step: "zipping" }
  | { step: "token" }
  | { step: "uploading"; fraction: number };

// Folder or zip, then Upload: a folder is zipped in the browser, a fresh upload token is requested through
// the proxy (it works once and lasts five minutes, so every attempt asks again), and the zip is posted
// straight to the backend with progress. The new version is handed to `onUploaded` (valid or not: an invalid
// one still exists and carries its report), then the page data is refreshed.
export function UploadPanel({
  kind,
  ownerId,
  expects,
  onUploaded,
}: {
  kind: ContentOwnerKind;
  ownerId: string;
  expects: string;
  onUploaded: (version: ContentVersion) => void;
}) {
  const t = useTranslations("ContentVersions.upload");
  const router = useRouter();
  const folderInput = useRef<HTMLInputElement>(null);
  const zipInput = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [phase, setPhase] = useState<Phase>({ step: "idle" });
  const [errorKey, setErrorKey] = useState<AuthErrorKey | null>(null);
  // A problem with the selection itself, found before anything is sent.
  const [pickProblem, setPickProblem] = useState<"notZip" | "emptyFolder" | null>(null);

  const busy = phase.step !== "idle";

  // The input is cleared after its files are copied out (its FileList is live), so picking the same folder
  // or file again still fires a change.
  function pickFolder(list: FileList | null) {
    const files = list ? Array.from(list) : [];
    if (folderInput.current) folderInput.current.value = "";
    if (files.length === 0) return;
    const plan = planFolder(files);
    if (plan.entries.length === 0) {
      setPicked(null);
      setPickProblem("emptyFolder");
      return;
    }
    setErrorKey(null);
    setPickProblem(null);
    setPicked({ kind: "folder", name: folderName(plan), plan });
  }

  function pickZip(list: FileList | null) {
    const file = list?.[0];
    if (zipInput.current) zipInput.current.value = "";
    if (!file) return;
    if (!isZipName(file.name)) {
      setPicked(null);
      setPickProblem("notZip");
      return;
    }
    setErrorKey(null);
    setPickProblem(null);
    setPicked({ kind: "zip", name: file.name, file });
  }

  async function start() {
    if (!picked || busy) return;
    setErrorKey(null);
    const controller = new AbortController();
    abort.current = controller;
    try {
      let body: Blob;
      if (picked.kind === "zip") {
        body = picked.file;
      } else {
        setPhase({ step: "zipping" });
        try {
          body = await zipFolder(picked.plan.entries);
        } catch {
          setErrorKey("FOLDER_UNREADABLE");
          return;
        }
      }
      if (controller.signal.aborted) return;
      setPhase({ step: "token" });
      const result = await uploadContent(kind, ownerId, body, {
        signal: controller.signal,
        onProgress: (fraction) => setPhase({ step: "uploading", fraction }),
      });
      if (!result.ok) {
        if (!result.aborted) setErrorKey(result.errorKey);
        return;
      }
      setPicked(null);
      onUploaded(result.version);
      router.refresh();
    } finally {
      abort.current = null;
      setPhase({ step: "idle" });
    }
  }

  return (
    <section aria-labelledby="upload-title" className="flex flex-col gap-3 rounded-lg border border-dashed p-4">
      <div className="flex flex-col gap-1">
        <h3 id="upload-title" className="text-sm font-medium">
          {t("title")}
        </h3>
        <p className="text-sm text-muted-foreground">{expects}</p>
        <p className="text-xs text-muted-foreground">{t("help")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={() => folderInput.current?.click()}>
          <FolderUpIcon aria-hidden />
          {t("chooseFolder")}
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => zipInput.current?.click()}>
          <FileArchiveIcon aria-hidden />
          {t("chooseZip")}
        </Button>
        <input
          ref={folderInput}
          type="file"
          className="hidden"
          tabIndex={-1}
          aria-hidden
          multiple
          {...{ webkitdirectory: "", directory: "" }}
          onChange={(event) => pickFolder(event.target.files)}
          data-testid="folder-input"
        />
        <input
          ref={zipInput}
          type="file"
          className="hidden"
          tabIndex={-1}
          aria-hidden
          accept=".zip,application/zip,application/x-zip-compressed"
          onChange={(event) => pickZip(event.target.files)}
          data-testid="zip-input"
        />
      </div>

      {pickProblem ? (
        <p role="alert" className="text-sm text-destructive">
          {t(pickProblem)}
        </p>
      ) : null}
      <FormError errorKey={errorKey} />

      {picked ? (
        <div className="flex flex-col gap-3 rounded-md bg-muted/50 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col gap-0.5 text-sm">
              <span className="font-medium break-words">
                <bdi>{picked.kind === "folder" ? t("folder", { name: picked.name }) : t("zip", { name: picked.name })}</bdi>
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {picked.kind === "folder"
                  ? t("summary", { count: picked.plan.entries.length, size: formatBytes(picked.plan.totalBytes) })
                  : t("zipSummary", { size: formatBytes(picked.file.size) })}
                {picked.kind === "folder" && picked.plan.skipped > 0 ? ` · ${t("skipped", { count: picked.plan.skipped })}` : ""}
              </span>
            </div>
            <Button type="button" variant="ghost" size="icon-sm" disabled={busy} aria-label={t("remove")} onClick={() => setPicked(null)}>
              <XIcon aria-hidden />
            </Button>
          </div>
          {busy ? <UploadProgress phase={phase} onCancel={() => abort.current?.abort()} /> : null}
          {!busy ? (
            <div>
              <Button type="button" onClick={() => void start()}>
                {t("start")}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function UploadProgress({ phase, onCancel }: { phase: Phase; onCancel: () => void }) {
  const t = useTranslations("ContentVersions.upload");
  const percent = phase.step === "uploading" ? Math.round(phase.fraction * 100) : 0;
  const processing = phase.step === "uploading" && phase.fraction >= 1;
  const label =
    phase.step === "zipping"
      ? t("zipping")
      : phase.step === "token"
        ? t("token")
        : processing
          ? t("processing")
          : t("uploading", { percent });
  const indeterminate = phase.step === "zipping" || phase.step === "token" || processing;
  return (
    <div className="flex flex-col gap-2" role="status" aria-live="polite">
      <Progress
        value={indeterminate ? (processing ? 100 : 0) : percent}
        aria-label={t("progressLabel")}
        className={indeterminate && processing ? "animate-pulse" : undefined}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm tabular-nums">{label}</span>
        {!processing ? (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            {t("cancel")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
