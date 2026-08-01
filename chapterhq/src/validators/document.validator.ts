import { z } from "zod";

export const createDocumentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(200, "Title must be 200 characters or less."),
  description: z
    .string()
    .trim()
    .max(1000, "Description must be 1000 characters or less.")
    .optional(),
  fileUrl: z.string().trim().url("Valid file URL is required."),
  category: z
    .string()
    .trim()
    .max(100, "Category must be 100 characters or less.")
    .optional(),
});

export const documentQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type DocumentQueryInput = z.infer<typeof documentQuerySchema>;
