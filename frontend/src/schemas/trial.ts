import { z } from "zod";

export const ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4"] as const;

export type ImageSizeOption = { label: string; value: string };

const DEFAULT_IMAGE_SIZES: ImageSizeOption[] = [
  { label: "1k", value: "1K" },
  { label: "2k", value: "2K" },
  { label: "4k", value: "4K" },
];

const OPENAI_IMAGE_SIZES: ImageSizeOption[] = [
  { label: "Auto", value: "auto" },
  { label: "1024×1024 (Square)", value: "1024x1024" },
  { label: "1536×1024 (Landscape)", value: "1536x1024" },
  { label: "1024×1536 (Portrait)", value: "1024x1536" },
];

type DefaultImageSizeValue = (typeof DEFAULT_IMAGE_SIZES)[number]["value"];

/** Which image sizes each model supports. Models not listed default to all sizes. */
export const MODEL_SUPPORTED_SIZES: Record<string, DefaultImageSizeValue[]> = {
  "gemini-2.5-flash-image": ["1K"],
  "gemini-3-pro-image-preview": ["1K", "2K", "4K"],
  "gemini-3.1-flash-image-preview": ["1K", "2K", "4K"],
};

export function getSizesForModel(model: string) {
  if (model === "gpt-image-1" || model === "gpt-image-2") return OPENAI_IMAGE_SIZES;
  const supported = MODEL_SUPPORTED_SIZES[model];
  if (!supported) return DEFAULT_IMAGE_SIZES;
  return DEFAULT_IMAGE_SIZES.filter((s) => supported.includes(s.value));
}

/** Models that support aspect_ratio. Models not listed do NOT support it. */
const MODELS_WITH_ASPECT_RATIO = new Set([
  "gemini-3-pro-image-preview",
  "gemini-3.1-flash-image-preview",
  "gpt-image-1",
  "gpt-image-2",
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
