import { describe, expect, it } from "vitest";
import { parseStudentAppUrl, previewUrl } from "@/lib/content/preview";

describe("parseStudentAppUrl", () => {
  it("accepts an http(s) address and drops a trailing slash", () => {
    expect(parseStudentAppUrl("https://app.becan.example")).toBe("https://app.becan.example");
    expect(parseStudentAppUrl("https://app.becan.example/")).toBe("https://app.becan.example");
    expect(parseStudentAppUrl("  http://localhost:3001//  ")).toBe("http://localhost:3001");
  });

  it("keeps a path prefix but not the query or hash", () => {
    expect(parseStudentAppUrl("https://example.com/student/?a=1#x")).toBe("https://example.com/student");
  });

  it("is null when unset, empty, blank or not a URL", () => {
    expect(parseStudentAppUrl(undefined)).toBeNull();
    expect(parseStudentAppUrl(null)).toBeNull();
    expect(parseStudentAppUrl("")).toBeNull();
    expect(parseStudentAppUrl("   ")).toBeNull();
    expect(parseStudentAppUrl("app.becan.example")).toBeNull();
    expect(parseStudentAppUrl("not a url")).toBeNull();
  });

  it("is null for a scheme other than http(s)", () => {
    expect(parseStudentAppUrl("javascript:alert(1)")).toBeNull();
    expect(parseStudentAppUrl("ftp://example.com")).toBeNull();
    expect(parseStudentAppUrl("data:text/html,hi")).toBeNull();
  });
});

describe("previewUrl", () => {
  const target = { courseSlug: "becan-test", chapterId: "00000000-0000-4000-8000-000000000001", versionId: "v-1" };

  it("builds the session URL pinned to one version", () => {
    expect(previewUrl("https://app.becan.example", target)).toBe(
      "https://app.becan.example/session/becan-test/00000000-0000-4000-8000-000000000001?version=v-1",
    );
  });

  it("adds the Course version when it is given", () => {
    expect(previewUrl("https://app.becan.example", { ...target, courseVersionId: "cv-9" })).toBe(
      "https://app.becan.example/session/becan-test/00000000-0000-4000-8000-000000000001?version=v-1&courseVersion=cv-9",
    );
    expect(previewUrl("https://a.example", { ...target, courseVersionId: null })).not.toContain("courseVersion");
  });

  it("encodes what it puts in the path and query", () => {
    const url = previewUrl("https://a.example", { courseSlug: "a b/c", chapterId: "x?y", versionId: "v&1" });
    expect(url).toBe("https://a.example/session/a%20b%2Fc/x%3Fy?version=v%261");
  });
});
