import type { AccountAllowance } from "./detail-types";

// The student app shows minutes studied as whole minutes rounded UP, and a minutes limit rounded
// DOWN (bcn-web-client src/lib/allowance). The Admin sees the same numbers.
export function minutesUsed(seconds: number): number {
  return Math.ceil(seconds / 60);
}

export function minutesLimit(seconds: number | null): number | null {
  return seconds === null ? null : Math.floor(seconds / 60);
}

export type Meter =
  | { kind: "unlimited"; used: number }
  | { kind: "limited"; used: number; limit: number; percent: number };

// A null limit is unlimited. Otherwise `percent` is whole and capped to 0..100, so a Student over
// the limit (a limit lowered mid-Period) still fills the bar without overflowing it. A limit of 0
// is full from the start.
export function meter(used: number, limit: number | null): Meter {
  if (limit === null) return { kind: "unlimited", used };
  const percent = limit <= 0 ? 100 : Math.min(100, Math.max(0, Math.round((used / limit) * 100)));
  return { kind: "limited", used, limit, percent };
}

export type UsageMeters = { sessions: Meter; minutes: Meter; slots: Meter };

export function usageMeters(allowance: AccountAllowance): UsageMeters {
  return {
    sessions: meter(allowance.usage.sessions, allowance.limits.sessions),
    minutes: meter(minutesUsed(allowance.usage.seconds), minutesLimit(allowance.limits.seconds)),
    slots: meter(allowance.usage.enrollments, allowance.limits.enrollments),
  };
}

// mm:ss, or h:mm:ss from one hour. Fractions are dropped, negatives and NaN count as zero.
export function formatDuration(seconds: number): string {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  const two = (value: number) => String(value).padStart(2, "0");
  return hours > 0 ? `${hours}:${two(minutes)}:${two(rest)}` : `${two(minutes)}:${two(rest)}`;
}
