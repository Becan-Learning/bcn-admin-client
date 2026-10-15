import { describe, expect, it } from "vitest";
import {
  adminInstitutionsResponseSchema,
  adminMajorsResponseSchema,
  groupMajors,
  type AdminInstitution,
  type AdminMajor,
} from "@/lib/catalog/types";

const institution = (id: string, sortOrder = 0): AdminInstitution => ({
  id,
  name: { ar: id, en: id },
  sortOrder,
  counts: { majors: 0, courses: 0, accounts: 0 },
  createdAt: "2026-10-15T00:00:00.000Z",
});
const major = (id: string, institutionId: string): AdminMajor => ({
  id,
  institutionId,
  name: { ar: id, en: id },
  sortOrder: 0,
  counts: { accounts: 0 },
  createdAt: "2026-10-15T00:00:00.000Z",
});

describe("groupMajors", () => {
  it("puts each Major under its Institution and keeps both orders", () => {
    const grouped = groupMajors(
      [institution("a"), institution("b"), institution("c")],
      [major("a-1", "a"), major("b-1", "b"), major("a-2", "a")],
    );
    expect(grouped.map((item) => item.id)).toEqual(["a", "b", "c"]);
    expect(grouped[0].majors.map((item) => item.id)).toEqual(["a-1", "a-2"]);
    expect(grouped[1].majors.map((item) => item.id)).toEqual(["b-1"]);
    expect(grouped[2].majors).toEqual([]);
  });

  it("leaves out a Major whose Institution is not in the list", () => {
    const grouped = groupMajors([institution("a")], [major("x-1", "x")]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].majors).toEqual([]);
  });
});

describe("response schemas", () => {
  it("accept the backend's shapes and drop unknown fields", () => {
    const institutions = adminInstitutionsResponseSchema.parse({
      institutions: [{ ...institution("ksu"), extra: true }],
    });
    expect(institutions.institutions[0]).not.toHaveProperty("extra");
    expect(adminMajorsResponseSchema.parse({ majors: [major("ksu-cs", "ksu")] }).majors).toHaveLength(1);
  });

  it("refuse a malformed response", () => {
    expect(adminInstitutionsResponseSchema.safeParse({ institutions: [{ id: "x" }] }).success).toBe(false);
    expect(adminMajorsResponseSchema.safeParse([]).success).toBe(false);
  });
});
