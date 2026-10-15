// The Account detail Profile form, as pure functions: what to send, and which field a backend error
// belongs to. The components only hold state and call the backend.
import type { AuthErrorKey } from "@/lib/auth/errors";

export type ProfileValues = {
  name: string;
  phoneNumber: string;
  institutionId: string;
  majorId: string;
};

export type ProfileField = keyof ProfileValues;

// The fields `admin/update-user` takes for the Profile (a subset of its allowlist).
export type ProfileChanges = Partial<ProfileValues>;

// Admins type a number the way Students say it. The backend stores E.164 (`+9665XXXXXXXX`) and
// rejects anything else with INVALID_PHONE_NUMBER; this only repairs the common local spellings.
// Anything it does not recognise is passed through for the backend to judge.
export function normalizePhoneNumber(input: string): string {
  const compact = input.replace(/[\s\-().]/g, "");
  if (/^05\d{8}$/.test(compact)) return `+966${compact.slice(1)}`;
  if (/^5\d{8}$/.test(compact)) return `+966${compact}`;
  if (/^9665\d{8}$/.test(compact)) return `+${compact}`;
  if (/^009665\d{8}$/.test(compact)) return `+${compact.slice(2)}`;
  return compact;
}

// What would be saved: the name trimmed and the phone number in E.164 where it can be repaired.
export function normalizeProfile(values: ProfileValues): ProfileValues {
  return {
    name: values.name.trim(),
    phoneNumber: normalizePhoneNumber(values.phoneNumber),
    institutionId: values.institutionId,
    majorId: values.majorId,
  };
}

// Only what changed. A Major belongs to one Institution, so a new Institution always sends the
// Major with it: the backend then checks the pair, never a stale Major against the new Institution.
export function diffProfile(initial: ProfileValues, current: ProfileValues): ProfileChanges {
  const next = normalizeProfile(current);
  const changes: ProfileChanges = {};

  if (next.name !== initial.name) changes.name = next.name;
  if (next.phoneNumber !== initial.phoneNumber) changes.phoneNumber = next.phoneNumber;
  if (next.institutionId !== initial.institutionId) {
    changes.institutionId = next.institutionId;
    changes.majorId = next.majorId;
  } else if (next.majorId !== initial.majorId) {
    changes.majorId = next.majorId;
  }
  return changes;
}

export function hasChanges(changes: ProfileChanges): boolean {
  return Object.keys(changes).length > 0;
}

// Client-side checks that need no backend: nothing may be empty. The format and the Institution and
// Major pairing are the backend's to judge, and come back as field errors.
export function missingFields(values: ProfileValues): ProfileField[] {
  const next = normalizeProfile(values);
  return (Object.keys(next) as ProfileField[]).filter((field) => next[field] === "");
}

export type FieldErrors<Field extends string> = Partial<Record<Field, AuthErrorKey>>;

// Backend error codes that belong to one field of the Profile form. Any other code is shown for
// the form as a whole.
const PROFILE_FIELD_ERRORS: Record<string, ProfileField> = {
  INVALID_PHONE_NUMBER: "phoneNumber",
  PHONE_NUMBER_TAKEN: "phoneNumber",
  INVALID_INSTITUTION: "institutionId",
  INVALID_MAJOR: "majorId",
};

const EMAIL_FIELD_ERRORS = new Set(["INVALID_EMAIL", "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"]);

export function profileFieldForError(code: string | undefined): ProfileField | null {
  if (!code || !Object.hasOwn(PROFILE_FIELD_ERRORS, code)) return null;
  return PROFILE_FIELD_ERRORS[code];
}

export function isEmailFieldError(code: string | undefined): boolean {
  return code !== undefined && EMAIL_FIELD_ERRORS.has(code);
}

// A failed update, placed on a field when the code names one, else on the form.
export type ProfileFailure = { field: ProfileField | null; errorKey: AuthErrorKey };

export function placeProfileError(
  code: string | undefined,
  errorKey: AuthErrorKey,
): ProfileFailure {
  return { field: profileFieldForError(code), errorKey };
}

// The email an Admin typed against the Account's current one. A change in letter case is not a
// change: the backend lower-cases the address.
export function isSameEmail(current: string, next: string): boolean {
  return current.trim().toLowerCase() === next.trim().toLowerCase();
}
