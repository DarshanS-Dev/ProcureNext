import { z } from "zod";

export const problemStatementSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  category: z.enum([
    "healthcare",
    "sanitation",
    "transport",
    "education",
    "agriculture",
    "governance",
    "iot_hardware",
  ]),
  target_beneficiaries: z.string().optional(),
  baseline: z.string().optional(),
  target: z.string().optional(),
  measurement_method: z.string().optional(),
  measurement_period: z.string().optional(),
  budget_range: z
    .enum(["under_5L", "5L_to_25L", "25L_to_1Cr", "over_1Cr"])
    .optional(),
  budget_description: z.string().optional(),
  sensitivity_flags: z.array(z.string()).optional(),
  success_condition: z.string().optional(),
  additional_required_documents: z.array(z.string()).optional(),
});

export type ProblemStatementFormValues = z.infer<typeof problemStatementSchema>;
