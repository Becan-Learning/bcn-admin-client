import { z } from "zod";

const localized = z.object({ ar: z.string(), en: z.string() });

// The contract of GET /api/v1/admin/accounts (backend AGENTS.md, "Admin Accounts list"). Unknown
// fields are dropped.
export const accountSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  phoneNumber: z.string(),
  role: z.string(),
  banned: z.boolean(),
  banExpires: z.string().nullable(),
  twoFactorEnabled: z.boolean().nullable(),
  createdAt: z.string(),
  institution: z.object({ id: z.string(), name: localized }),
  major: z.object({ id: z.string(), name: localized }),
});

export const accountsResponseSchema = z.object({
  accounts: z.array(accountSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
});

export type AdminAccount = z.infer<typeof accountSchema>;
export type AccountsResponse = z.infer<typeof accountsResponseSchema>;

// GET /api/v1/institutions (public).
export const institutionsResponseSchema = z.array(
  z.object({
    id: z.string(),
    name: localized,
    majors: z.array(z.object({ id: z.string(), name: localized })),
  }),
);

export type Institution = z.infer<typeof institutionsResponseSchema>[number];
