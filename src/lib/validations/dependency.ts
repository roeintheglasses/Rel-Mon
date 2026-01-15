import { z } from "zod";

export const dependencyTypeEnum = z.enum([
  "BLOCKS",
  "SOFT_DEPENDENCY",
  "REQUIRES_SYNC",
]);

export type DependencyType = z.infer<typeof dependencyTypeEnum>;

export const createDependencySchema = z.object({
  blockingReleaseId: z.string().min(1, "Blocking release is required"),
  type: dependencyTypeEnum.optional().default("BLOCKS"),
  description: z.string().max(500).optional(),
});

export type CreateDependencyInput = z.infer<typeof createDependencySchema>;

export const updateDependencySchema = z.object({
  type: dependencyTypeEnum.optional(),
  description: z.string().max(500).optional(),
  isResolved: z.boolean().optional(),
});

export type UpdateDependencyInput = z.infer<typeof updateDependencySchema>;
