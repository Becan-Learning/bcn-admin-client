import messages from "../../../messages/en.json";
import { actionMessageKey } from "./actions";

type Labels = typeof messages.AuditLog;
export type ActionLabelKey = keyof Labels["actions"];
export type FieldLabelKey = keyof Labels["fields"];
export type TargetTypeLabelKey = keyof Labels["targetTypes"];

function has<T extends object>(table: T, key: string): key is Extract<keyof T, string> {
  return Object.hasOwn(table, key);
}

// The key under `AuditLog.actions` for a backend action name, or null for a name we have no label
// for yet (the caller then shows the raw name).
export function actionLabelKey(action: string): ActionLabelKey | null {
  const key = actionMessageKey(action);
  return has(messages.AuditLog.actions, key) ? key : null;
}

export function fieldLabelKey(field: string): FieldLabelKey | null {
  return has(messages.AuditLog.fields, field) ? field : null;
}

export function targetTypeLabelKey(targetType: string): TargetTypeLabelKey | null {
  return has(messages.AuditLog.targetTypes, targetType) ? targetType : null;
}
