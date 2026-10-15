export type AuditValues = Record<string, unknown> | null;

export type AuditChange = {
  key: string;
  // `undefined` means the key is absent on that side; `null` is a stored null.
  before: unknown;
  after: unknown;
};

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// The keys whose value differs between the two sides of an entry, in a stable order. A key present
// on one side only counts as changed (the backend records `{ sessionId }` before and nothing after
// for a revoked session).
export function diffAuditValues(before: AuditValues, after: AuditValues): AuditChange[] {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const changes: AuditChange[] = [];
  for (const key of [...keys].sort()) {
    const was = before ? before[key] : undefined;
    const now = after ? after[key] : undefined;
    if (!same(was, now)) changes.push({ key, before: was, after: now });
  }
  return changes;
}
