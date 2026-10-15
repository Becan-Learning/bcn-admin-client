import { roles } from "./access-control";

// What the gate needs from the backend's session. The backend re-checks every call: this only
// decides what to render.
export type GateSession = {
  user: {
    role?: string | null;
    twoFactorEnabled?: boolean | null;
  };
} | null;

export type GateOutcome = "sign-in" | "no-access" | "setup-two-factor" | "ok";

type AdminPermissions = Parameters<(typeof roles)["admin"]["authorize"]>[0];

// The permission that marks an Admin. Code checks permissions, never role names.
const ADMIN_PERMISSION: AdminPermissions = { user: ["list"] };

function isRoleName(name: string): name is keyof typeof roles {
  return Object.hasOwn(roles, name);
}

// An Account's `role` is the stored Role name, or a comma-separated list of them.
export function roleHasPermission(
  role: string | null | undefined,
  permissions: AdminPermissions
): boolean {
  if (!role) return false;
  return role
    .split(",")
    .map((name) => name.trim())
    .some((name) => isRoleName(name) && roles[name].authorize(permissions).success);
}

export function adminGate(session: GateSession): GateOutcome {
  if (!session) return "sign-in";
  if (!roleHasPermission(session.user.role, ADMIN_PERMISSION)) return "no-access";
  if (session.user.twoFactorEnabled !== true) return "setup-two-factor";
  return "ok";
}
