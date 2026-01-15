import { z } from "zod";

export const deployOrderEnum = z.enum(["SEQUENTIAL", "SIMULTANEOUS"]);

export const deploymentGroupStatusEnum = z.enum([
  "PENDING",
  "READY",
  "DEPLOYING",
  "DEPLOYED",
  "CANCELLED",
]);

export const createDeploymentGroupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  sprintId: z.string().optional(),
  deployOrder: deployOrderEnum.optional(),
  targetDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  notifyOnReady: z.boolean().optional(),
});

export const updateDeploymentGroupSchema = createDeploymentGroupSchema.partial().extend({
  status: deploymentGroupStatusEnum.optional(),
  ownerId: z.string().optional().nullable(),
});

export const assignReleasesSchema = z.object({
  releaseIds: z.array(z.string()).min(1, "At least one release is required"),
});

export type DeployOrder = z.infer<typeof deployOrderEnum>;
export type DeploymentGroupStatus = z.infer<typeof deploymentGroupStatusEnum>;
export type CreateDeploymentGroupInput = z.infer<typeof createDeploymentGroupSchema>;
export type UpdateDeploymentGroupInput = z.infer<typeof updateDeploymentGroupSchema>;
export type AssignReleasesInput = z.infer<typeof assignReleasesSchema>;
