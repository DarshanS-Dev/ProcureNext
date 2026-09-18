import { z } from "zod";

export const containmentPlanSchema = z.object({
  max_scope: z.string().optional(),
  max_financial_exposure: z.string().optional(),
  fallback_process: z.string().optional(),
  data_terms: z.string().optional(),
  exit_conditions: z.string().optional(),
  support_obligations: z.string().optional(),
});

export type ContainmentPlanFormValues = z.infer<typeof containmentPlanSchema>;
