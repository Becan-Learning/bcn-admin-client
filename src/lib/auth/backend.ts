import "server-only";

export function backendUrl(): string {
  return process.env.BACKEND_URL?.trim().replace(/\/+$/, "") || "http://localhost:3000";
}
