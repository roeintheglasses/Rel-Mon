import { z } from "zod";

export const createSprintSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  goal: z.string().max(500).optional(),
});

export const updateSprintSchema = createSprintSchema.partial().extend({
  status: z.enum(["PLANNING", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
});

export type CreateSprintInput = z.infer<typeof createSprintSchema>;
export type UpdateSprintInput = z.infer<typeof updateSprintSchema>;
