import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAuditLog } from "@/lib/audit-log/api";

const entry = {
  id: "1",
  actor: { id: "a1", name: "Ann", email: "ann@example.com" },
  action: "account.ban",
  targetType: "account",
  targetId: "t1",
  before: { banned: false },
  after: { banned: true },
  reason: "spam",
  createdAt: "2026-10-15T10:00:00.000Z",
};

function respond(status: number, body: unknown) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));
}

afterEach(() => vi.unstubAllGlobals());

describe("fetchAuditLog", () => {
  it("returns a parsed page", async () => {
    respond(200, { entries: [entry], total: 1, limit: 50, offset: 0 });
    const result = await fetchAuditLog("limit=50&offset=0");
    expect(result).toMatchObject({ ok: true, page: { total: 1 } });
  });

  it("calls the same-origin endpoint with the query", async () => {
    respond(200, { entries: [], total: 0, limit: 50, offset: 0 });
    await fetchAuditLog("limit=50&offset=0&action=account.ban");
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/admin/audit-log?limit=50&offset=0&action=account.ban",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("maps backend codes to our own message keys, never the backend text", async () => {
    respond(403, { error: { code: "ADMIN_PERMISSION_REQUIRED", message: "raw backend text" } });
    expect(await fetchAuditLog("")).toEqual({ ok: false, errorKey: "ADMIN_PERMISSION_REQUIRED" });

    respond(401, { error: { code: "UNAUTHENTICATED", message: "Authentication required" } });
    expect(await fetchAuditLog("")).toEqual({ ok: false, errorKey: "UNAUTHENTICATED" });

    respond(403, { error: { code: "ADMIN_TWO_FACTOR_REQUIRED" } });
    expect(await fetchAuditLog("")).toEqual({ ok: false, errorKey: "ADMIN_TWO_FACTOR_REQUIRED" });
  });

  it("maps rate limits and unknown failures", async () => {
    respond(429, { error: { message: "Too many Audit log requests" } });
    expect(await fetchAuditLog("")).toEqual({ ok: false, errorKey: "RATE_LIMITED" });

    respond(500, { error: { message: "Internal server error" } });
    expect(await fetchAuditLog("")).toEqual({ ok: false, errorKey: "UNKNOWN" });
  });

  it("reports a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("fetch failed"))));
    expect(await fetchAuditLog("")).toEqual({ ok: false, errorKey: "NETWORK" });
  });

  it("does not trust a body that has the wrong shape", async () => {
    respond(200, { entries: "nope" });
    expect(await fetchAuditLog("")).toEqual({ ok: false, errorKey: "UNKNOWN" });
  });
});
