import "server-only";

import { redirect } from "next/navigation";
import { adminGate, type GateOutcome } from "./gate";
import { getSession, type AdminSession } from "./session";

const DESTINATIONS = {
  "sign-in": "/sign-in",
  "no-access": "/no-access",
  "setup-two-factor": "/setup-two-factor",
  ok: "/"
} as const satisfies Record<GateOutcome, string>;

// Verifies the session with the backend and sends the visitor to the page for their state. Pages
// call it with the state they serve; it returns the session only when the gate agrees.
export async function requireGate(expected: Exclude<GateOutcome, "sign-in">): Promise<AdminSession> {
  const session = await getSession();
  const outcome = adminGate(session);
  if (outcome !== expected || !session) redirect(DESTINATIONS[outcome]);
  return session;
}
