import { z } from "zod";

/** `AdminProductImageResponseDto` of the API. */
export const imageSchema = z.object({
  id: z.string(),
  position: z.number(),
  altText: z.string().nullable(),
  mimeType: z.string(),
  sizeBytes: z.number().nullable(),
  status: z.enum(["PENDING", "PROCESSED", "FAILED"]),
  previewUrl: z.string().nullable(),
});
