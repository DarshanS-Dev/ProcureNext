import { z } from "zod";

export const evaluationScoreEntrySchema = z.object({
  criterion_id: z.number().int(),
  score: z.number().min(0, "Score cannot be negative").max(100, "Score cannot exceed 100"),
  justification: z.string().min(5, "Justification must be at least 5 characters"),
});

export const evaluationScoreSchema = z.object({
  scores: z.array(evaluationScoreEntrySchema).min(1, "At least one score required"),
});

export type EvaluationScoreFormValues = z.infer<typeof evaluationScoreSchema>;
