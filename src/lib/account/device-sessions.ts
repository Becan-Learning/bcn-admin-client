// What the My account page needs from Better Auth's `listSessions`.
export type DeviceSession = {
  id: string;
  token: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: Date | string;
};

function time(value: Date | string): number {
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

// This device first, then the most recently signed in.
export function sortDeviceSessions<T extends DeviceSession>(sessions: T[], currentId: string): T[] {
  return [...sessions].sort((a, b) => {
    if (a.id === currentId) return -1;
    if (b.id === currentId) return 1;
    return time(b.createdAt) - time(a.createdAt);
  });
}
