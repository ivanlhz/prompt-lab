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
    .any()
    .nullable()
    .optional()
    .superRefine((value, ctx) => {
      if (value == null) return;
      if (!(value instanceof File)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Reference image must be a file",
        });
        return;
      }
      if (!ALLOWED_IMAGE_TYPES.includes(value.type)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "File must be PNG, JPG, or WebP",
        });
      }
    }),
});

export type ExperimentFormData = z.infer<typeof experimentSchema>;
