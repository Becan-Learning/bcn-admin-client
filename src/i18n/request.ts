import { getRequestConfig } from "next-intl/server";

// English only, no locale prefix in URLs. A second locale would add routing here.
export default getRequestConfig(async () => ({
  locale: "en",
  messages: (await import("../../messages/en.json")).default,
}));
