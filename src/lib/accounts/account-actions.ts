// Calls the browser makes for one Account's Profile. Same origin: next.config.ts rewrites /api/auth/*
// and /api/v1/* to the backend, so the Admin's cookie goes along.
import { authClient } from "@/lib/auth/client";
import { authErrorKey, type AuthErrorKey } from "@/lib/auth/errors";
import { backendErrorKey } from "./errors";
import { placeProfileError, isEmailFieldError, type ProfileChanges, type ProfileFailure } from "./profile-form";

export type ActionResult = { ok: true } | { ok: false; errorKey: AuthErrorKey };

export type UpdateProfileResult = { ok: true } | ({ ok: false } & ProfileFailure);

export type UpdateEmailResult =
  | { ok: true }
  | { ok: false; field: "email" | null; errorKey: AuthErrorKey };

async function updateUser(userId: string, data: Record<string, unknown>) {
  try {
    const { error } = await authClient.admin.updateUser({ userId, data });
    return { error: error ?? null, network: false };
  } catch {
    return { error: null, network: true };
  }
}

// `admin/update-user` with only the changed Profile fields.
export async function updateProfile(
  userId: string,
  changes: ProfileChanges,
): Promise<UpdateProfileResult> {
  const result = await updateUser(userId, changes);
  if (result.network) return { ok: false, field: null, errorKey: "NETWORK" };
  if (!result.error) return { ok: true };
  return { ok: false, ...placeProfileError(result.error.code, authErrorKey(result.error)) };
}

// A new email: the backend makes it unverified and sends the verification email.
export async function changeEmail(userId: string, email: string): Promise<UpdateEmailResult> {
  const result = await updateUser(userId, { email: email.trim() });
  if (result.network) return { ok: false, field: null, errorKey: "NETWORK" };
  if (!result.error) return { ok: true };
  return {
    ok: false,
    field: isEmailFieldError(result.error.code) ? "email" : null,
    errorKey: authErrorKey(result.error),
  };
}

export async function markEmailVerified(userId: string): Promise<ActionResult> {
  const result = await updateUser(userId, { emailVerified: true });
  if (result.network) return { ok: false, errorKey: "NETWORK" };
  if (!result.error) return { ok: true };
  return { ok: false, errorKey: authErrorKey(result.error) };
}

async function errorCode(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    const code = (body as { error?: { code?: unknown } } | null)?.error?.code;
    return typeof code === "string" ? code : undefined;
  } catch {
    return undefined;
  }
}

async function postEmailRoute(accountId: string, route: string): Promise<ActionResult> {
  let response: Response;
  try {
    response = await fetch(`/api/v1/admin/accounts/${encodeURIComponent(accountId)}/${route}`, {
      method: "POST",
      cache: "no-store",
    });
  } catch {
    return { ok: false, errorKey: "NETWORK" };
  }
  if (response.ok) return { ok: true };
  return {
    ok: false,
    errorKey: backendErrorKey({ status: response.status, code: await errorCode(response) }),
  };
}

// Both answer 204 and write an Audit log entry on the backend.
export const sendVerificationEmail = (accountId: string) =>
  postEmailRoute(accountId, "verification-email");
export const sendPasswordResetEmail = (accountId: string) =>
  postEmailRoute(accountId, "password-reset");
