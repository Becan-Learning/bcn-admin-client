import { describe, expect, it } from "vitest";
import { isValidSlug, suggestSlug } from "@/lib/catalog/slug";

describe("isValidSlug", () => {
  it("accepts the backend's pattern", () => {
    for (const id of ["ksu", "ksu-cs", "a", "0", "a_b-c", "a".repeat(80)]) {
      expect(isValidSlug(id), id).toBe(true);
    }
  });

  it("refuses everything else", () => {
    for (const id of ["", "-ksu", "_ksu", "KSU", "ksu cs", "ksu.cs", "كلية", "ksu\n", "a".repeat(81)]) {
      expect(isValidSlug(id), id).toBe(false);
    }
  });
});

describe("suggestSlug", () => {
  it("lower-cases and joins words with a dash", () => {
    expect(suggestSlug("King Saud University")).toBe("king-saud-university");
    expect(suggestSlug("  Computer  Science!! ")).toBe("computer-science");
  });

  it("puts a prefix in front", () => {
    expect(suggestSlug("Computer Science", "ksu")).toBe("ksu-computer-science");
  });

  it("gives nothing for a name with no ASCII letters or digits", () => {
    expect(suggestSlug("علوم الحاسب")).toBe("");
    expect(suggestSlug("علوم الحاسب", "ksu")).toBe("");
  });

  it("always gives a valid slug or nothing, cut at 80 characters with no dangling dash", () => {
    const long = suggestSlug("word ".repeat(40));
    expect(long.length).toBeLessThanOrEqual(80);
    expect(long.endsWith("-")).toBe(false);
    expect(isValidSlug(long)).toBe(true);
    for (const input of ["x", "--a--", "A_B", "Ünï 1"]) {
      const slug = suggestSlug(input);
      expect(slug === "" || isValidSlug(slug), input).toBe(true);
    }
  });
});
