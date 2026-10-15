import { describe, expect, it } from "vitest";
import { langfuseSessionUrl } from "@/lib/accounts/langfuse";

describe("langfuseSessionUrl", () => {
  const project = "https://cloud.langfuse.com/project/abc123";

  it("builds the Session URL from the room name", () => {
    expect(langfuseSessionUrl(project, "ss_0b1c")).toBe(
      "https://cloud.langfuse.com/project/abc123/sessions/ss_0b1c",
    );
  });

  it("ignores trailing slashes and surrounding spaces", () => {
    expect(langfuseSessionUrl(`  ${project}//  `, "ss_1")).toBe(`${project}/sessions/ss_1`);
  });

  it("encodes the room name", () => {
    expect(langfuseSessionUrl(project, "ss a/b")).toBe(`${project}/sessions/ss%20a%2Fb`);
  });

  it("returns no link when the project URL is unset, empty or not http(s)", () => {
    expect(langfuseSessionUrl(undefined, "ss_1")).toBeNull();
    expect(langfuseSessionUrl(null, "ss_1")).toBeNull();
    expect(langfuseSessionUrl("", "ss_1")).toBeNull();
    expect(langfuseSessionUrl("   ", "ss_1")).toBeNull();
    expect(langfuseSessionUrl("javascript:alert(1)", "ss_1")).toBeNull();
  });

  it("returns no link without a room", () => {
    expect(langfuseSessionUrl(project, "")).toBeNull();
  });
});
