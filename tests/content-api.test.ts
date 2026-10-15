import { afterEach, describe, expect, it, vi } from "vitest";
import messages from "../messages/en.json";
import { deleteVersion, postZip, requestUploadToken, setLiveVersion } from "@/lib/content/api";
import { uploadErrorKey } from "@/lib/content/errors";
import { contentVersionSchema, contentVersionsResponseSchema, ownerPath } from "@/lib/content/types";

const VERSION = {
  id: "v-1",
  ownerKind: "chapter",
  ownerId: "ch-1",
  version: 1,
  prefix: "courses/c/chapters/ch-1/v1/",
  valid: false,
  live: false,
  lessonCount: null,
  firstLiveAt: null,
  createdAt: "2026-10-01T00:00:00.000Z",
  createdBy: { id: "u1", name: "Admin" },
  manifest: [{ path: "lessons_list.json", size: 12, sha256: "abc" }],
  report: [{ file: "lessons_list.json", path: "/lessons", rule: "schema", message: "bad" }],
  preview: { previewed: false, adminSessions: 0 },
  sessions: 0,
  deletable: true,
  somethingNew: true,
};

function respond(status: number, body?: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(body === undefined ? null : JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("version schema", () => {
  it("parses a version and drops unknown fields", () => {
    const parsed = contentVersionSchema.parse(VERSION);
    expect(parsed.version).toBe(1);
    expect("somethingNew" in parsed).toBe(false);
  });

  it("accepts a version registered in place (no manifest, no report)", () => {
    const parsed = contentVersionSchema.parse({ ...VERSION, manifest: null, report: null, valid: true });
    expect(parsed.manifest).toBeNull();
    expect(parsed.report).toBeNull();
  });

  it("refuses a malformed list", () => {
    expect(contentVersionsResponseSchema.safeParse({ versions: [{ id: "x" }] }).success).toBe(false);
    expect(contentVersionsResponseSchema.safeParse({ versions: [VERSION] }).success).toBe(true);
  });

  it("builds the owner route", () => {
    expect(ownerPath("chapter", "a b")).toBe("chapters/a%20b");
    expect(ownerPath("course", "c1")).toBe("courses/c1");
  });
});

describe("Content version calls", () => {
  it("ask for an upload token on the owner's route", async () => {
    const fetchMock = respond(200, { token: "t", uploadUrl: "http://localhost:3000/api/v1/uploads/content", expiresAt: "x" });
    const result = await requestUploadToken("chapter", "ch-1");
    expect(result).toEqual({
      ok: true,
      token: { token: "t", uploadUrl: "http://localhost:3000/api/v1/uploads/content", expiresAt: "x" },
    });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/admin/chapters/ch-1/upload-token");
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
  });

  it("show 503 as unavailable storage", async () => {
    respond(503, { error: { code: "CONTENT_STORAGE_UNAVAILABLE" } });
    expect(await requestUploadToken("course", "c1")).toEqual({
      ok: false,
      field: null,
      errorKey: "CONTENT_STORAGE_UNAVAILABLE",
    });
  });

  it("PUT the version id to set live", async () => {
    const fetchMock = respond(200, VERSION);
    expect(await setLiveVersion("course", "c1", "v-2")).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/admin/courses/c1/live-version");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual({ versionId: "v-2" });
  });

  it("map VERSION_INVALID, VERSION_IN_USE and a storage failure", async () => {
    respond(409, { error: { code: "VERSION_INVALID" } });
    expect(await setLiveVersion("chapter", "ch-1", "v-1")).toMatchObject({ ok: false, errorKey: "VERSION_INVALID" });
    respond(409, { error: { code: "VERSION_IN_USE" } });
    expect(await deleteVersion("chapter", "ch-1", "v-1")).toMatchObject({ ok: false, errorKey: "VERSION_IN_USE" });
    respond(502, { error: { code: "CONTENT_STORAGE_FAILED" } });
    expect(await deleteVersion("chapter", "ch-1", "v-1")).toMatchObject({ ok: false, errorKey: "CONTENT_STORAGE_FAILED" });
  });

  it("DELETE a version with its id encoded", async () => {
    const fetchMock = respond(204);
    expect(await deleteVersion("chapter", "ch-1", "v/1")).toEqual({ ok: true });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/admin/chapters/ch-1/versions/v%2F1");
    expect(fetchMock.mock.calls[0][1].method).toBe("DELETE");
  });
});

// Every code the upload and version routes answer has a message (backend PR 46).
const CODES = [
  "UPLOAD_TOKEN_REQUIRED",
  "UPLOAD_TOKEN_INVALID",
  "UPLOAD_TOKEN_USED",
  "UPLOAD_TOKEN_EXPIRED",
  "ADMIN_PERMISSION_REQUIRED",
  "ADMIN_TWO_FACTOR_REQUIRED",
  "PAYLOAD_TOO_LARGE",
  "UNSUPPORTED_UPLOAD_TYPE",
  "EMPTY_UPLOAD",
  "INVALID_ARCHIVE",
  "EMPTY_ARCHIVE",
  "UNSAFE_ARCHIVE_PATH",
  "TOO_MANY_ENTRIES",
  "ARCHIVE_TOO_LARGE",
  "CONTENT_STORAGE_UNAVAILABLE",
  "CONTENT_STORAGE_FAILED",
  "VERSION_INVALID",
  "VERSION_IN_USE",
  "CONTENT_VERSION_NOT_FOUND",
  "CHAPTER_NOT_FOUND",
  "COURSE_NOT_FOUND",
  "FOLDER_UNREADABLE",
] as const;

describe("uploadErrorKey", () => {
  it("has an English message for every code and maps it to itself", () => {
    for (const code of CODES) {
      expect(messages.Errors[code], code).toBeTruthy();
      expect(uploadErrorKey({ status: 400, code }), code).toBe(code);
    }
  });

  it("reads a 401 with an upload token code as that code, not as an ended session", () => {
    expect(uploadErrorKey({ status: 401, code: "UPLOAD_TOKEN_EXPIRED" })).toBe("UPLOAD_TOKEN_EXPIRED");
    expect(uploadErrorKey({ status: 401, code: "UPLOAD_TOKEN_USED" })).toBe("UPLOAD_TOKEN_USED");
  });

  it("falls back on the status when there is no known code", () => {
    expect(uploadErrorKey({ status: 413 })).toBe("PAYLOAD_TOO_LARGE");
    expect(uploadErrorKey({ status: 415 })).toBe("UNSUPPORTED_UPLOAD_TYPE");
    expect(uploadErrorKey({ status: 429 })).toBe("RATE_LIMITED");
    expect(uploadErrorKey({ status: 0 })).toBe("NETWORK");
    expect(uploadErrorKey({ status: 400, code: "SOMETHING_NEW" })).toBe("INVALID_REQUEST");
    expect(uploadErrorKey({ status: 500 })).toBe("UNKNOWN");
  });
});

// A stand-in for XMLHttpRequest that records what was sent and lets the test finish it.
class FakeXhr {
  static last: FakeXhr;
  method = "";
  url = "";
  headers: Record<string, string> = {};
  body: unknown;
  status = 0;
  responseText = "";
  responseType = "";
  upload: { onprogress: ((event: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = {
    onprogress: null,
  };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  onabort: (() => void) | null = null;
  constructor() {
    FakeXhr.last = this;
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  send(body: unknown) {
    this.body = body;
  }
  abort() {
    this.onabort?.();
  }
  finish(status: number, body: unknown) {
    this.status = status;
    this.responseText = typeof body === "string" ? body : JSON.stringify(body);
    this.onload?.();
  }
}

describe("postZip", () => {
  const URL = "http://localhost:3000/api/v1/uploads/content";
  const zip = new Blob(["zip"], { type: "application/zip" });

  it("sends the raw zip with the bearer token and reports progress", async () => {
    vi.stubGlobal("XMLHttpRequest", FakeXhr);
    const progress: number[] = [];
    const pending = postZip(URL, "tok", zip, { onProgress: (fraction) => progress.push(fraction) });
    const xhr = FakeXhr.last;
    expect(xhr.method).toBe("POST");
    expect(xhr.url).toBe(URL);
    expect(xhr.headers).toEqual({ Authorization: "Bearer tok", "Content-Type": "application/zip" });
    expect(xhr.body).toBe(zip);
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 1, total: 4 });
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 4, total: 4 });
    xhr.upload.onprogress?.({ lengthComputable: false, loaded: 0, total: 0 });
    xhr.finish(201, VERSION);
    const result = await pending;
    expect(progress).toEqual([0.25, 1]);
    expect(result.ok && result.version.valid).toBe(false);
  });

  it("maps an error code to its message key", async () => {
    vi.stubGlobal("XMLHttpRequest", FakeXhr);
    const pending = postZip(URL, "tok", zip);
    FakeXhr.last.finish(400, { error: { code: "UNSAFE_ARCHIVE_PATH" } });
    expect(await pending).toEqual({ ok: false, errorKey: "UNSAFE_ARCHIVE_PATH" });

    const expired = postZip(URL, "tok", zip);
    FakeXhr.last.finish(401, { error: { code: "UPLOAD_TOKEN_EXPIRED" } });
    expect(await expired).toEqual({ ok: false, errorKey: "UPLOAD_TOKEN_EXPIRED" });

    const big = postZip(URL, "tok", zip);
    FakeXhr.last.finish(413, "<html>too large</html>");
    expect(await big).toEqual({ ok: false, errorKey: "PAYLOAD_TOO_LARGE" });
  });

  it("is a network error when the request fails, and an abort when cancelled", async () => {
    vi.stubGlobal("XMLHttpRequest", FakeXhr);
    const failed = postZip(URL, "tok", zip);
    FakeXhr.last.onerror?.();
    expect(await failed).toEqual({ ok: false, errorKey: "NETWORK" });

    const controller = new AbortController();
    const cancelled = postZip(URL, "tok", zip, { signal: controller.signal });
    controller.abort();
    expect(await cancelled).toMatchObject({ ok: false, aborted: true });
  });

  it("does not send the token to a URL that is not http(s)", async () => {
    vi.stubGlobal("XMLHttpRequest", FakeXhr);
    FakeXhr.last = undefined as unknown as FakeXhr;
    expect(await postZip("javascript:alert(1)", "tok", zip)).toEqual({ ok: false, errorKey: "UNKNOWN" });
    expect(FakeXhr.last).toBeUndefined();
  });

  it("refuses an answer that is not a version", async () => {
    vi.stubGlobal("XMLHttpRequest", FakeXhr);
    const pending = postZip(URL, "tok", zip);
    FakeXhr.last.finish(201, { nope: true });
    expect(await pending).toEqual({ ok: false, errorKey: "UNKNOWN" });
  });
});
