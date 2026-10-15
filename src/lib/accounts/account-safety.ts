// The risky Account actions (ban, Role change, removal), as pure functions: what to send, whether a
// typed confirmation matches, and how a backend error becomes a message key. The components only hold
// state and call the backend.
import { authErrorKey, type AuthClientError, type AuthErrorKey } from "@/lib/auth/errors";

export const BAN_EXPIRY_CHOICES = ["never", "1", "7", "30", "custom"] as const;
export type BanExpiryChoice = (typeof BAN_EXPIRY_CHOICES)[number];

const SECONDS_PER_DAY = 24 * 60 * 60;
// A ban longer than ten years is a mistake or a typo: use "never".
export const MAX_CUSTOM_BAN_DAYS = 3650;

export type BanExpiry = { ok: true; seconds: number | undefined } | { ok: false };

// The `banExpiresIn` to send to `admin/ban-user`: seconds, or undefined for a ban that never expires.
// "custom" needs a whole number of days from 1 to MAX_CUSTOM_BAN_DAYS.
export function banExpiresIn(choice: BanExpiryChoice, customDays: string): BanExpiry {
  if (choice === "never") return { ok: true, seconds: undefined };
  if (choice !== "custom") return { ok: true, seconds: Number(choice) * SECONDS_PER_DAY };

  const trimmed = customDays.trim();
  if (!/^\d+$/.test(trimmed)) return { ok: false };
  const days = Number(trimmed);
  if (days < 1 || days > MAX_CUSTOM_BAN_DAYS) return { ok: false };
  return { ok: true, seconds: days * SECONDS_PER_DAY };
}

// Removing an Account asks for its email, typed in full. Surrounding spaces (from a paste) do not
// count; everything else must match exactly.
export function emailConfirmationMatches(typed: string, email: string): boolean {
  return email !== "" && typed.trim() === email;
}

// Better Auth's admin plugin sets this reason when none was given.
const DEFAULT_BAN_REASON = "No reason";

// The reason Admins typed, or null when there was none.
export function banReasonText(reason: string | null | undefined): string | null {
  const trimmed = reason?.trim();
  return !trimmed || trimmed === DEFAULT_BAN_REASON ? null : trimmed;
}

export type BanExpiryState =
  | { kind: "never" }
  | { kind: "active"; at: Date }
  | { kind: "expired"; at: Date };

// A ban that is over stays on the row until the Account next tries to sign in (the plugin lifts it
// then), so the page tells an Admin apart "banned until" from "expired, not yet lifted".
export function banExpiryState(banExpires: string | null | undefined, now: Date): BanExpiryState {
  if (!banExpires) return { kind: "never" };
  const at = new Date(banExpires);
  if (Number.isNaN(at.getTime())) return { kind: "never" };
  return at.getTime() > now.getTime() ? { kind: "active", at } : { kind: "expired", at };
}

// Codes the admin plugin returns for these actions that already have a clearer message of ours.
// Self-targeting is refused by the backend first with ADMIN_SELF_TARGET; the plugin's own codes stay
// mapped in case that hook ever lets one through.
const ALIASES: Record<string, AuthErrorKey> = {
  YOU_CANNOT_BAN_YOURSELF: "ADMIN_SELF_TARGET",
  YOU_CANNOT_REMOVE_YOURSELF: "ADMIN_SELF_TARGET",
  SESSION_NOT_FRESH: "FRESH_SESSION_REQUIRED",
  YOU_ARE_NOT_ALLOWED_TO_CHANGE_USERS_ROLE: "ADMIN_PERMISSION_REQUIRED",
  YOU_ARE_NOT_ALLOWED_TO_LIST_USERS_SESSIONS: "ADMIN_PERMISSION_REQUIRED",
  YOU_ARE_NOT_ALLOWED_TO_BAN_USERS: "ADMIN_PERMISSION_REQUIRED",
  YOU_ARE_NOT_ALLOWED_TO_REVOKE_USERS_SESSIONS: "ADMIN_PERMISSION_REQUIRED",
  YOU_ARE_NOT_ALLOWED_TO_DELETE_USERS: "ADMIN_PERMISSION_REQUIRED",
  YOU_ARE_NOT_ALLOWED_TO_GET_USER: "ADMIN_PERMISSION_REQUIRED",
};

// A failed Account action as a key under `Errors` in messages/en.json. The backend's text is never shown.
export function accountActionErrorKey(error: AuthClientError): AuthErrorKey {
  if (error?.code && Object.hasOwn(ALIASES, error.code)) return ALIASES[error.code]!;
  return authErrorKey(error);
}

// The error that asks for a fresh Device session: the page offers to sign in again.
export function needsFreshSession(errorKey: AuthErrorKey | null): boolean {
  return errorKey === "FRESH_SESSION_REQUIRED";
}
