"use client";

import { createAuthClient } from "better-auth/react";
import {
  adminClient,
  inferAdditionalFields,
  twoFactorClient
} from "better-auth/client/plugins";
import { ac, roles } from "./access-control";
import { RETURN_PARAM, returnPathFromLocation } from "./return-path";

// Same origin: next.config.ts rewrites /api/auth/* to the backend, so cookies stay host-only.
export const authClient = createAuthClient({
  plugins: [
    adminClient({ ac, roles }),
    twoFactorClient({
      // The pending sign-in lives in an HTTP-only cookie the backend set; the challenge page
      // finishes it.
      onTwoFactorRedirect() {
        // Keep the page to return to (set by "Sign in again") through the challenge.
        const url = new URL("/two-factor", window.location.origin);
        const back = returnPathFromLocation();
        if (back) url.searchParams.set(RETURN_PARAM, back);
        window.location.assign(url);
      }
    }),
    inferAdditionalFields({
      user: {
        phoneNumber: { type: "string", required: true },
        phoneNumberVerified: { type: "boolean", required: false, input: false },
        institutionId: { type: "string", required: true },
        majorId: { type: "string", required: true },
        role: { type: "string", required: false, input: false },
        banned: { type: "boolean", required: false, input: false },
        banReason: { type: "string", required: false, input: false },
        banExpires: { type: "date", required: false, input: false },
        twoFactorEnabled: { type: "boolean", required: false, input: false }
      }
    })
  ]
});
