import { isAuditAction, type AuditAction } from "./actions";

export const PAGE_SIZE = 50;
const MAX_PAGE = 100_000;
const MAX_TEXT = 200;

// Everything the Audit log page shows is a function of these, and they all live in the URL.
export type AuditFilters = {
  page: number;
  action?: AuditAction;
  actorId?: string;
  targetId?: string;
  // ISO dates (YYYY-MM-DD). The backend reads each as a whole UTC day.
  from?: string;
  to?: string;
};

type ParamSource = { get(name: string): string | null };

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function text(source: ParamSource, name: string): string | undefined {
  const value = source.get(name)?.trim();
  return value && value.length <= MAX_TEXT ? value : undefined;
}

function date(source: ParamSource, name: string): string | undefined {
  const value = source.get(name)?.trim();
  return value && isIsoDate(value) ? value : undefined;
}

function pageOf(source: ParamSource): number {
  const raw = source.get("page")?.trim();
  if (!raw || !/^\d+$/.test(raw)) return 1;
  const page = Number(raw);
  return page >= 1 && page <= MAX_PAGE ? page : 1;
}

// Anything the page cannot use is dropped rather than forwarded: the URL is user input.
export function parseAuditFilters(source: ParamSource): AuditFilters {
  const action = text(source, "action");
  const filters: AuditFilters = { page: pageOf(source) };
  if (action && isAuditAction(action)) filters.action = action;

  const actorId = text(source, "actorId");
  if (actorId) filters.actorId = actorId;
  const targetId = text(source, "targetId");
  if (targetId) filters.targetId = targetId;
  const from = date(source, "from");
  if (from) filters.from = from;
  const to = date(source, "to");
  if (to) filters.to = to;
  return filters;
}

// The page's own URL state. Defaults are left out so a clean URL means a clean view.
export function toPageParams(filters: AuditFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.action) params.set("action", filters.action);
  if (filters.actorId) params.set("actorId", filters.actorId);
  if (filters.targetId) params.set("targetId", filters.targetId);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.page > 1) params.set("page", String(filters.page));
  return params;
}

// The query for GET /api/v1/admin/audit-log. The target filter is an Account id, so it also names
// the target type.
export function toBackendQuery(filters: AuditFilters): URLSearchParams {
  const params = new URLSearchParams();
  params.set("limit", String(PAGE_SIZE));
  params.set("offset", String((filters.page - 1) * PAGE_SIZE));
  if (filters.action) params.set("action", filters.action);
  if (filters.actorId) params.set("actorId", filters.actorId);
  if (filters.targetId) {
    params.set("targetType", "account");
    params.set("targetId", filters.targetId);
  }
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  return params;
}

export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}

export function hasActiveFilters(filters: AuditFilters): boolean {
  return Boolean(
    filters.action || filters.actorId || filters.targetId || filters.from || filters.to,
  );
}
