import { z } from "zod";

export const ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4"] as const;

export const IMAGE_SIZES = [
  { label: "1k", value: "1K" },
  { label: "2k", value: "2K" },
  { label: "4k", value: "4K" },
] as const;

export type ImageSizeValue = (typeof IMAGE_SIZES)[number]["value"];

/** Which image sizes each model supports. Models not listed default to all sizes. */
export const MODEL_SUPPORTED_SIZES: Record<string, ImageSizeValue[]> = {
  "gemini-2.5-flash-image": ["1K"],
  "gemini-3-pro-image-preview": ["1K", "2K", "4K"],
  "gemini-3.1-flash-image-preview": ["1K", "2K", "4K"],
};

export function getSizesForModel(model: string) {
  const supported = MODEL_SUPPORTED_SIZES[model];
  if (!supported) return IMAGE_SIZES;
  return IMAGE_SIZES.filter((s) => supported.includes(s.value));
}

/** Models that support aspect_ratio. Models not listed do NOT support it. */
const MODELS_WITH_ASPECT_RATIO = new Set([
  "gemini-3-pro-image-preview",
  "gemini-3.1-flash-image-preview",
]);

export function supportsAspectRatio(model: string): boolean {
  return MODELS_WITH_ASPECT_RATIO.has(model);
}

export const MAX_IMAGES_PER_PROMPT = 4;

export const trialFormSchema = z.object({
  provider: z.string().min(1, "Provider is required"),
  model: z.string().min(1, "Model is required"),
  temperature: z.number().min(0, "Min 0").max(2, "Max 2"),
  aspectRatio: z.enum(ASPECT_RATIOS).optional(),
  imageSize: z.string().optional(),
  prompts: z
    .array(z.string().min(1, "Prompt cannot be empty"))
    .min(1, "At least one prompt is required"),
  imagesPerPrompt: z.number().int().min(1).max(MAX_IMAGES_PER_PROMPT),
});

export type TrialFormData = z.infer<typeof trialFormSchema>;
