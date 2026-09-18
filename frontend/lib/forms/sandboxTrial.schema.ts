import { z } from "zod";

export const sandboxTrialCreateSchema = z.object({
  functional_check: z.enum(["pass", "fail"]),
  directional_kpi_check: z.enum(["pass", "fail"]),
  operational_fit_check: z.enum(["pass", "fail"]),
  no_red_flags_check: z.enum(["pass", "fail"]),
  verification_mode: z.enum(["desk_review", "field_visit"]),
  notes: z.string().optional(),
});

export const sandboxTrialUpdateSchema = z.object({
  verdict: z.enum(["promising", "not_promising", "inconclusive"]).optional(),
  notes: z.string().optional(),
});

export type SandboxTrialCreateValues = z.infer<typeof sandboxTrialCreateSchema>;
export type SandboxTrialUpdateValues = z.infer<typeof sandboxTrialUpdateSchema>;
