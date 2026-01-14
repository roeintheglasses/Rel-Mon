import { z } from "zod";

export const createServiceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  repoOwner: z.string().max(100).optional(),
  repoName: z.string().max(100).optional(),
  repoUrl: z.string().url().optional().or(z.literal("")),
  jiraProjectKey: z.string().max(20).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const updateServiceSchema = createServiceSchema.partial();

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
