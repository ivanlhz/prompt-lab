import { z } from "zod";

const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

export const experimentSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less"),
  description: z.string().optional(),
  file: z
    .instanceof(File, { message: "Reference image is required" })
    .refine(
      (f) => ALLOWED_IMAGE_TYPES.includes(f.type),
      "File must be PNG, JPG, or WebP"
    ),
});

export type ExperimentFormData = z.infer<typeof experimentSchema>;
