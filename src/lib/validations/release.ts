import { z } from "zod";

export const releaseStatusEnum = z.enum([
  "PLANNING",
  "IN_DEVELOPMENT",
  "IN_REVIEW",
  "READY_STAGING",
  "IN_STAGING",
  "STAGING_VERIFIED",
  "READY_PRODUCTION",
  "DEPLOYED",
  "CANCELLED",
  "ROLLED_BACK",
]);

export const createReleaseSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  serviceId: z.string().min(1, "Service is required"),
  sprintId: z.string().optional(),
  ownerId: z.string().optional(),
  version: z.string().max(50).optional(),
  targetDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
});

export const updateReleaseSchema = createReleaseSchema.partial().extend({
  status: releaseStatusEnum.optional(),
  isBlocked: z.boolean().optional(),
  blockedReason: z.string().max(500).nullable().optional(),
});

export type CreateReleaseInput = z.infer<typeof createReleaseSchema>;
export type UpdateReleaseInput = z.infer<typeof updateReleaseSchema>;
export type ReleaseStatus = z.infer<typeof releaseStatusEnum>;
