import { describe, expect, it } from "vitest";
import messages from "../messages/en.json";
import { AUDIT_ACTIONS, actionMessageKey, isAuditAction } from "@/lib/audit-log/actions";
import { actionLabelKey, fieldLabelKey, targetTypeLabelKey } from "@/lib/audit-log/labels";

describe("action labels", () => {
  it("turns dotted action names into message keys", () => {
    expect(actionMessageKey("account.ban")).toBe("account_ban");
    expect(actionMessageKey("account.set-role")).toBe("account_set_role");
    expect(actionMessageKey("account.revoke-sessions")).toBe("account_revoke_sessions");
  });

  it("has an English label for every action the backend writes", () => {
    for (const action of AUDIT_ACTIONS) {
      const key = actionLabelKey(action);
      expect(key, action).not.toBeNull();
      expect(messages.AuditLog.actions[key!]).toBeTruthy();
    }
  });

  it("has a message for every label key and no stray ones", () => {
    const expected = AUDIT_ACTIONS.map(actionMessageKey).sort();
    expect(Object.keys(messages.AuditLog.actions).sort()).toEqual(expected);
  });

  it("returns null for an action it has no label for, so the raw name is shown", () => {
    expect(actionLabelKey("account.teleport")).toBeNull();
    expect(actionLabelKey("constructor")).toBeNull();
    expect(actionLabelKey("")).toBeNull();
  });

  it("knows which names are valid filters", () => {
    expect(isAuditAction("account.update")).toBe(true);
    expect(isAuditAction("account_update")).toBe(false);
    expect(isAuditAction("toString")).toBe(false);
  });
});

describe("field and target type labels", () => {
  it("labels the fields the backend records", () => {
    expect(fieldLabelKey("banReason")).toBe("banReason");
    expect(fieldLabelKey("sessionCount")).toBe("sessionCount");
    expect(fieldLabelKey("passwordHash")).toBeNull();
    expect(fieldLabelKey("constructor")).toBeNull();
  });

  it("labels the Account target type", () => {
    expect(targetTypeLabelKey("account")).toBe("account");
    expect(targetTypeLabelKey("course")).toBeNull();
  });
});
