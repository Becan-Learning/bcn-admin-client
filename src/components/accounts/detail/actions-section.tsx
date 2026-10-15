import type { AccountProfile } from "@/lib/accounts/fetch-account";

// Slot for the Actions section (ban and unban, Device sessions, Role and removal), built in admin-client issue #5. Renders nothing
// until then. The detail page already renders it, so #5 only fills in this file (and its own
// siblings): it can be an async Server Component that fetches its data inside a <Suspense>, and a
// client child for its controls. The Account's profile is passed in for its id and state.
export function AccountActionsSection({ account }: { account: AccountProfile }) {
  void account;
  return null;
}
