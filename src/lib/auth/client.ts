"use client";

import { createAuthClient } from "better-auth/react";
import {
  adminClient,
  inferAdditionalFields,
  twoFactorClient
} from "better-auth/client/plugins";
import { ac, roles } from "./access-control";

// Same origin: next.config.ts rewrites /api/auth/* to the backend, so cookies stay host-only.
export const authClient = createAuthClient({
  plugins: [
    adminClient({ ac, roles }),
    twoFactorClient({
      // The pending sign-in lives in an HTTP-only cookie the backend set; the challenge page
      // finishes it.
      onTwoFactorRedirect() {
        window.location.assign(new URL("/two-factor", window.location.origin));
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
