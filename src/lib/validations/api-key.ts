import { z } from "zod";

export const apiKeyScopesEnum = z.enum([
  "releases:read",
  "releases:write",
  "sprints:read",
  "dependencies:read",
  "dependencies:write",
]);

export const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  scopes: z.array(apiKeyScopesEnum).min(1, "At least one scope is required"),
  expiresAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
});

export const updateApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  isActive: z.boolean().optional(),
  scopes: z.array(apiKeyScopesEnum).min(1, "At least one scope is required").optional(),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>;
export type ApiKeyScope = z.infer<typeof apiKeyScopesEnum>;
