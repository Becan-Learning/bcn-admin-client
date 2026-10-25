// The action names the backend writes (AuditAction in its src/services/audit-log.service.ts).
// An entry can carry a name this list does not know yet: show it as it is, never hide it.
export const AUDIT_ACTIONS = [
  "account.ban",
  "account.unban",
  "account.set-role",
  "account.update",
  "account.remove",
  "account.revoke-session",
  "account.revoke-sessions",
  "account.password-reset-sent",
  "account.verification-email-sent",
  "enrollment.grant",
  "enrollment.end",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export function isAuditAction(value: string): value is AuditAction {
  return (AUDIT_ACTIONS as readonly string[]).includes(value);
}

// next-intl treats "." as a nesting separator, so message keys cannot hold the dotted action name.
// `account.set-role` is looked up as `account_set_role` in messages/en.json (`AuditLog.actions`).
export function actionMessageKey(action: string): string {
  return action.replace(/[^A-Za-z0-9]+/g, "_");
}
