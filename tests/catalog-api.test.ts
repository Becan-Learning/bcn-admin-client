import { afterEach, describe, expect, it, vi } from "vitest";
import { createInstitution, createMajor, editInstitution, editMajor } from "@/lib/catalog/api";

function respond(status: number, body?: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(body === undefined ? null : JSON.stringify(body), { status }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("Catalog writes", () => {
  it("POST an Institution to the same-origin admin route", async () => {
    const fetchMock = respond(201, {});
    const body = { id: "ksu", nameEn: "KSU", nameAr: "جامعة", sortOrder: 1 };
    expect(await createInstitution(body)).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/admin/institutions");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual(body);
  });

  it("PATCH only the changes, with the id encoded in the path and not in the body", async () => {
    const fetchMock = respond(200, {});
    await editInstitution("ksu", { nameEn: "New" });
    await editMajor("ksu-cs", { sortOrder: 3 });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/admin/institutions/ksu");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/v1/admin/majors/ksu-cs");
    expect(fetchMock.mock.calls[0][1].method).toBe("PATCH");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ nameEn: "New" });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ sortOrder: 3 });
  });

  it("place a taken id on the id field", async () => {
    respond(409, { error: { message: "taken", code: "INSTITUTION_ID_TAKEN" } });
    expect(
      await createInstitution({ id: "ksu", nameEn: "a", nameAr: "ب", sortOrder: 0 }),
    ).toEqual({ ok: false, field: "id", errorKey: "INSTITUTION_ID_TAKEN" });
  });

  it("place MAJOR_IN_USE and INVALID_INSTITUTION on the Institution field", async () => {
    respond(409, { error: { code: "MAJOR_IN_USE" } });
    expect(await editMajor("ksu-cs", { institutionId: "kfupm" })).toEqual({
      ok: false,
      field: "institutionId",
      errorKey: "MAJOR_IN_USE",
    });
    respond(400, { error: { code: "INVALID_INSTITUTION" } });
    expect(
      await createMajor({ id: "x", institutionId: "nope", nameEn: "a", nameAr: "ب", sortOrder: 0 }),
    ).toMatchObject({ ok: false, field: "institutionId", errorKey: "INVALID_INSTITUTION" });
  });

  it("show a body-check 400, a non-JSON error and a network failure for the form", async () => {
    respond(400, { error: { message: "Invalid request", details: {} } });
    expect(await editMajor("x", { nameEn: "a" })).toEqual({
      ok: false,
      field: null,
      errorKey: "INVALID_REQUEST",
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>", { status: 502 })));
    expect(await editMajor("x", { nameEn: "a" })).toMatchObject({ ok: false, errorKey: "UNKNOWN" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fail")));
    expect(await editMajor("x", { nameEn: "a" })).toMatchObject({ ok: false, errorKey: "NETWORK" });
  });
});
