import { z } from "zod";

export const ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4"] as const;

export const IMAGE_SIZES = [
  { label: "Small (512x512)", value: "512x512" },
  { label: "Medium (1024x1024)", value: "1024x1024" },
  { label: "Large (1536x1024)", value: "1536x1024" },
  { label: "Tall (1024x1536)", value: "1024x1536" },
] as const;

const baseSchema = z.object({
  provider: z.string().min(1, "Provider is required"),
  model: z.string().min(1, "Model is required"),
  temperature: z.number().min(0, "Min 0").max(2, "Max 2"),
  aspectRatio: z.enum(ASPECT_RATIOS).optional(),
  imageSize: z.string().optional(),
});

export const singleTrialSchema = baseSchema.extend({
  batchMode: z.literal(false),
  prompt: z.string().min(1, "Prompt is required"),
});

export const batchTrialSchema = baseSchema.extend({
  batchMode: z.literal(true),
  batchPrompts: z.string().min(1, "At least one prompt is required"),
});

export const trialFormSchema = z.discriminatedUnion("batchMode", [
  singleTrialSchema,
  batchTrialSchema,
]);

export type TrialFormData = z.infer<typeof trialFormSchema>;
