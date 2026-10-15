import { describe, expect, it } from "vitest";
import {
  deleteBlockers,
  formatBytes,
  groupReport,
  liveAction,
  liveVersionOf,
  manifestTotal,
  needsPreview,
} from "@/lib/content/rules";
import type { ContentVersion } from "@/lib/content/types";

function version(over: Partial<ContentVersion> & { version: number }): ContentVersion {
  return {
    id: `id-${over.version}`,
    ownerKind: "chapter",
    ownerId: "owner",
    prefix: `courses/c/chapters/ch/v${over.version}/`,
    valid: true,
    live: false,
    lessonCount: 6,
    firstLiveAt: null,
    createdAt: "2026-10-01T00:00:00.000Z",
    createdBy: { id: "u1", name: "Admin" },
    manifest: [],
    report: [],
    preview: { previewed: false, adminSessions: 0 },
    sessions: 0,
    deletable: true,
    ...over,
  };
}

describe("formatBytes", () => {
  it("writes bytes, then KB, MB and GB with one decimal", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(3.2 * 1024 * 1024)).toBe("3.2 MB");
    expect(formatBytes(5 * 1024 ** 3)).toBe("5.0 GB");
  });

  it("does not print 1024.0 of a unit", () => {
    expect(formatBytes(1024 * 1024 - 1)).toBe("1.0 MB");
    expect(formatBytes(1023)).toBe("1023 B");
  });

  it("treats a bad number as zero", () => {
    expect(formatBytes(-5)).toBe("0 B");
    expect(formatBytes(Number.NaN)).toBe("0 B");
  });

  it("sums a manifest", () => {
    expect(
      manifestTotal([
        { path: "a", size: 10, sha256: "x" },
        { path: "b", size: 32, sha256: "y" },
      ]),
    ).toBe(42);
    expect(manifestTotal([])).toBe(0);
  });
});

describe("groupReport", () => {
  const issue = (file: string, rule: string, path = "") => ({ file, path, rule, message: `${rule} in ${file}` });

  it("groups by file in order of first appearance and keeps the validator's order within a file", () => {
    const groups = groupReport([
      issue("b.json", "r1", "/a"),
      issue("a.json", "r2"),
      issue("b.json", "r3", "/b"),
    ]);
    expect(groups.map((group) => group.file)).toEqual(["b.json", "a.json"]);
    expect(groups[0].issues.map((entry) => entry.rule)).toEqual(["r1", "r3"]);
    expect(groups[1].issues).toHaveLength(1);
  });

  it("keeps a finding about the whole archive under an empty file name", () => {
    expect(groupReport([issue("", "missing_file")])).toEqual([
      { file: "", issues: [{ file: "", path: "", rule: "missing_file", message: "missing_file in " }] },
    ]);
  });

  it("is empty for no findings", () => {
    expect(groupReport([])).toEqual([]);
  });
});

describe("liveAction", () => {
  const v1 = version({ version: 1 });
  const v2 = version({ version: 2, live: true, firstLiveAt: "2026-10-02T00:00:00.000Z" });
  const v3 = version({ version: 3 });
  const bad = version({ version: 4, valid: false });
  const all = [bad, v3, v2, v1];

  it("offers a rollback on an older valid version while a newer one is live", () => {
    expect(liveAction(v1, all)).toBe("rollback");
  });

  it("offers Set live on a newer valid version", () => {
    expect(liveAction(v3, all)).toBe("set-live");
  });

  it("offers Set live when nothing is live yet", () => {
    expect(liveAction(v1, [v1, v3])).toBe("set-live");
  });

  it("offers nothing on the live version or an invalid one", () => {
    expect(liveAction(v2, all)).toBeNull();
    expect(liveAction(bad, all)).toBeNull();
  });

  it("finds the live version", () => {
    expect(liveVersionOf(all)?.version).toBe(2);
    expect(liveVersionOf([v1, v3])).toBeNull();
  });
});

describe("deleteBlockers", () => {
  it("is empty when the backend says deletable", () => {
    expect(deleteBlockers(version({ version: 1 }))).toEqual([]);
  });

  it("says live for the live version, without also saying it was live", () => {
    expect(
      deleteBlockers(version({ version: 1, live: true, deletable: false, firstLiveAt: "2026-10-02T00:00:00.000Z" })),
    ).toEqual(["live"]);
  });

  it("says a version that was live once is kept", () => {
    expect(deleteBlockers(version({ version: 1, deletable: false, firstLiveAt: "2026-10-02T00:00:00.000Z" }))).toEqual([
      "wasLive",
    ]);
  });

  it("adds Sessions", () => {
    expect(deleteBlockers(version({ version: 1, deletable: false, sessions: 3 }))).toEqual(["sessions"]);
    expect(
      deleteBlockers(version({ version: 1, deletable: false, sessions: 3, firstLiveAt: "2026-10-02T00:00:00.000Z" })),
    ).toEqual(["wasLive", "sessions"]);
  });
});

describe("needsPreview", () => {
  it("is true for a valid, never-live version no Admin Session has used", () => {
    expect(needsPreview(version({ version: 1 }))).toBe(true);
  });

  it("is false once previewed, live, ever live or invalid", () => {
    expect(needsPreview(version({ version: 1, preview: { previewed: true, adminSessions: 1 } }))).toBe(false);
    expect(needsPreview(version({ version: 1, live: true }))).toBe(false);
    expect(needsPreview(version({ version: 1, firstLiveAt: "2026-10-02T00:00:00.000Z" }))).toBe(false);
    expect(needsPreview(version({ version: 1, valid: false }))).toBe(false);
  });
});
