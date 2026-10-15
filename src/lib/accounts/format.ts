// Dates on the Account detail page are shown in UTC, with the zone named, so two Admins see the same
// time wherever they are and server and browser agree.
const dateTime = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});
const date = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });

export function formatDateTimeUtc(iso: string): string {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? iso : `${dateTime.format(parsed)} UTC`;
}

export function formatDateUtc(iso: string): string {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? iso : date.format(parsed);
}
