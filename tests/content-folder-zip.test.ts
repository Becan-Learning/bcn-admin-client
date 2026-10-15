import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import {
  compressionLevel,
  folderName,
  isJunkPath,
  isZipName,
  normalizeEntryPath,
  planFolder,
  zipFolder,
} from "@/lib/content/folder-zip";

const picked = (path: string, size = 10) => ({ name: path.split("/").at(-1)!, webkitRelativePath: path, size });

describe("normalizeEntryPath", () => {
  it("uses forward slashes and drops empty and dot segments", () => {
    expect(normalizeEntryPath("a\\b\\c.json")).toBe("a/b/c.json");
    expect(normalizeEntryPath("./a//b/./c.json")).toBe("a/b/c.json");
    expect(normalizeEntryPath("/a/b")).toBe("a/b");
    expect(normalizeEntryPath("")).toBe("");
    expect(normalizeEntryPath("./")).toBe("");
  });
});

describe("isJunkPath", () => {
  it("flags macOS and Windows litter", () => {
    expect(isJunkPath(".DS_Store")).toBe(true);
    expect(isJunkPath("ch/.DS_Store")).toBe(true);
    expect(isJunkPath("__MACOSX/ch/._a.json")).toBe(true);
    expect(isJunkPath("ch/__MACOSX/x")).toBe(true);
    expect(isJunkPath("ch/._a.json")).toBe(true);
    expect(isJunkPath("ch/Thumbs.db")).toBe(true);
  });

  it("keeps content", () => {
    expect(isJunkPath("ch/lessons_list.json")).toBe(false);
    expect(isJunkPath("ch/slides.pdf")).toBe(false);
    expect(isJunkPath("ch/.hidden-but-real.json")).toBe(false);
  });
});

describe("planFolder", () => {
  it("keeps the relative paths, the picked folder first", () => {
    const plan = planFolder([picked("chapter-3/lessons_list.json", 5), picked("chapter-3/intro.json", 7), picked("chapter-3/slides.pdf", 100)]);
    expect(plan.entries.map((entry) => entry.path)).toEqual([
      "chapter-3/lessons_list.json",
      "chapter-3/intro.json",
      "chapter-3/slides.pdf",
    ]);
    expect(plan.totalBytes).toBe(112);
    expect(plan.skipped).toBe(0);
    expect(folderName(plan)).toBe("chapter-3");
  });

  it("leaves out system files and counts them", () => {
    const plan = planFolder([picked("c/a.json"), picked("c/.DS_Store"), picked("__MACOSX/c/._a.json")]);
    expect(plan.entries.map((entry) => entry.path)).toEqual(["c/a.json"]);
    expect(plan.skipped).toBe(2);
  });

  it("uses the bare name when the picker gives no relative path", () => {
    const plan = planFolder([{ name: "cast.json", size: 3 }]);
    expect(plan.entries.map((entry) => entry.path)).toEqual(["cast.json"]);
  });

  it("skips a repeated path and is empty for an empty or all-junk folder", () => {
    expect(planFolder([picked("c/a.json"), picked("c/a.json")]).entries).toHaveLength(1);
    expect(planFolder([]).entries).toEqual([]);
    expect(planFolder([picked(".DS_Store")]).entries).toEqual([]);
    expect(folderName(planFolder([]))).toBe("");
  });
});

describe("compression and names", () => {
  it("stores already-compressed files and deflates the rest", () => {
    expect(compressionLevel("c/slides.pdf")).toBe(0);
    expect(compressionLevel("c/SLIDES.PDF")).toBe(0);
    expect(compressionLevel("c/lessons_list.json")).toBe(6);
    expect(compressionLevel("c/01_Course_Knowledge_Schema.md")).toBe(6);
  });

  it("recognises a zip by its extension", () => {
    expect(isZipName("chapter.zip")).toBe(true);
    expect(isZipName("Chapter.ZIP")).toBe(true);
    expect(isZipName("chapter.zip.txt")).toBe(false);
    expect(isZipName("chapter")).toBe(false);
  });
});

describe("zipFolder", () => {
  it("zips the planned files under their relative paths", async () => {
    const entries = [
      { file: new File(['{"a":1}'], "lessons_list.json"), path: "ch/lessons_list.json" },
      { file: new File([new Uint8Array([1, 2, 3])], "slides.pdf"), path: "ch/slides.pdf" },
    ];
    const blob = await zipFolder(entries);
    expect(blob.type).toBe("application/zip");
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    expect(Object.keys(files).sort()).toEqual(["ch/lessons_list.json", "ch/slides.pdf"]);
    expect(new TextDecoder().decode(files["ch/lessons_list.json"])).toBe('{"a":1}');
    expect(Array.from(files["ch/slides.pdf"])).toEqual([1, 2, 3]);
  });
});
