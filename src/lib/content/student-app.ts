import "server-only";

import { parseStudentAppUrl } from "./preview";

// The student app's base URL from STUDENT_APP_URL (server-only, optional), or null: no preview link. Read at
// request time like LANGFUSE_PROJECT_URL, so it needs no NEXT_PUBLIC_ prefix.
export function studentAppUrl(): string | null {
  return parseStudentAppUrl(process.env.STUDENT_APP_URL);
}
