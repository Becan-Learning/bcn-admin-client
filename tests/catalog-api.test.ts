import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createCourse,
  createInstitution,
  createMajor,
  deleteCourse,
  editCourse,
  editInstitution,
  editMajor,
  setCourseStatus,
} from "@/lib/catalog/api";

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

describe("Course writes", () => {
  const course = {
    slug: "calc-1",
    code: "MATH101",
    nameEn: "Calculus 1",
    nameAr: "التفاضل",
    institutionId: "ksu",
    icon: "atom",
    tone: "olive",
    sortOrder: 0,
  } as const;

  it("POST a Course and hand back the new id", async () => {
    const fetchMock = respond(201, { id: "c-1", slug: "calc-1" });
    expect(await createCourse(course)).toEqual({ ok: true, id: "c-1" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/admin/courses");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual(course);
  });

  it("place SLUG_TAKEN and INVALID_INSTITUTION on their fields when creating", async () => {
    respond(409, { error: { code: "SLUG_TAKEN" } });
    expect(await createCourse(course)).toEqual({ ok: false, field: "slug", errorKey: "SLUG_TAKEN" });
    respond(400, { error: { code: "INVALID_INSTITUTION" } });
    expect(await createCourse(course)).toMatchObject({ ok: false, field: "institutionId" });
  });

  it("PATCH only the changes to the Course's own path", async () => {
    const fetchMock = respond(200, {});
    expect(await editCourse("c-1", { slug: "calc-one" })).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/admin/courses/c-1");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ slug: "calc-one" });
  });

  it("PUT the status with only the status in the body", async () => {
    const fetchMock = respond(200, {});
    expect(await setCourseStatus("c-1", "archived")).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/admin/courses/c-1/status");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual({ status: "archived" });
  });

  it("show PUBLISH_PRECONDITION and SLUG_TAKEN of a status change", async () => {
    respond(409, { error: { code: "PUBLISH_PRECONDITION" } });
    expect(await setCourseStatus("c-1", "draft")).toEqual({
      ok: false,
      field: null,
      errorKey: "PUBLISH_PRECONDITION",
    });
    respond(409, { error: { code: "SLUG_TAKEN" } });
    expect(await setCourseStatus("c-1", "published")).toMatchObject({ ok: false, errorKey: "SLUG_TAKEN" });
  });

  it("DELETE with no body, accept 204, and show COURSE_IN_USE", async () => {
    const fetchMock = respond(204);
    expect(await deleteCourse("c-1")).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/admin/courses/c-1");
    expect(init.method).toBe("DELETE");
    expect(init.body).toBeUndefined();

    respond(409, { error: { code: "COURSE_IN_USE" } });
    expect(await deleteCourse("c-1")).toEqual({ ok: false, field: null, errorKey: "COURSE_IN_USE" });
  });

  it("encode an id that is not a plain token", async () => {
    const fetchMock = respond(200, {});
    await editCourse("a/b", { code: "x" });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/admin/courses/a%2Fb");
  });
});
