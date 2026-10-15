import { redirect } from "next/navigation";

// The Catalog has no page of its own: the nav entry opens its first sub-page.
export default function Page() {
  redirect("/catalog/institutions");
}
