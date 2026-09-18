import { z } from "zod";

export const pilotMilestoneUpdateSchema = z.object({
  due_date: z.string().optional(),
  target_value: z.string().optional(),
  target_unit: z.string().optional(),
  display_name: z.string().optional(),
});

export const milestoneReviewUpdateSchema = z.object({
  status: z.enum(["accepted", "rejected"]),
  payment_status: z.enum(["not_due", "due", "paid"]),
});

export type PilotMilestoneUpdateValues = z.infer<typeof pilotMilestoneUpdateSchema>;
export type MilestoneReviewUpdateValues = z.infer<typeof milestoneReviewUpdateSchema>;
