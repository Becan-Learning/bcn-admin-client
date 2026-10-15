// The id of an Institution or a Major is a slug, set once at creation and never changed (backend
// AGENTS.md, "Admin Catalog API"). The pattern is the backend's `slugPattern`; this copy only gives
// an early answer in the form, the backend still judges.
export const SLUG_PATTERN = /^[a-z0-9][a-z0-9_-]{0,79}$/;
export const SLUG_MAX_LENGTH = 80;

export function isValidSlug(value: string): boolean {
  return SLUG_PATTERN.test(value);
}

// A starting id for what the Admin typed as the English name: lower case, runs of anything else become
// one "-", cut to 80 characters with no dangling "-". Arabic and other non-ASCII letters are dropped,
// so a name with no ASCII letters or digits gives "". An optional prefix (a Major's Institution id,
// by the seed's convention) goes in front.
export function suggestSlug(name: string, prefix = ""): string {
  const body = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!body) return "";
  const joined = prefix ? `${prefix}-${body}` : body;
  return joined.slice(0, SLUG_MAX_LENGTH).replace(/-+$/, "");
}
