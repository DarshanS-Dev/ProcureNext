import { z } from "zod";

export const capabilityProfileSchema = z.object({
  team_headcount: z.number().int().nonnegative().optional(),
  tech_stack: z.array(z.string()).optional(),
  trl_stage: z
    .number()
    .int()
    .min(1, "TRL stage must be between 1 and 9")
    .max(9, "TRL stage must be between 1 and 9")
    .optional(),
  architecture: z
    .array(
      z.enum([
        "cloud",
        "microservices",
        "on_premise",
        "monolith",
        "api_first",
      ])
    )
    .optional(),
  api_available: z.boolean().optional(),
  past_deployments: z.array(z.any()).optional(),
  funding_band: z
    .enum([
      "bootstrapped",
      "pre_seed",
      "seed",
      "series_a",
      "series_b_plus",
    ])
    .optional(),
  description: z.string().optional(),
});

export type CapabilityProfileFormValues = z.infer<typeof capabilityProfileSchema>;
