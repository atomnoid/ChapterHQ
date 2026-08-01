import { z } from "zod";
import { paginationQuerySchema } from "@/lib/pagination";

export const createCommitteeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Committee name must be at least 2 characters.")
    .max(100, "Committee name must be 100 characters or less."),
  description: z
    .string()
    .trim()
    .max(500, "Description must be 500 characters or less.")
    .optional(),
});

export const updateCommitteeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Committee name must be at least 2 characters.")
    .max(100, "Committee name must be 100 characters or less.")
    .optional(),
  description: z
    .string()
    .trim()
    .max(500, "Description must be 500 characters or less.")
    .optional(),
});

export const committeeQuerySchema = paginationQuerySchema;

export type CreateCommitteeInput = z.infer<typeof createCommitteeSchema>;
export type UpdateCommitteeInput = z.infer<typeof updateCommitteeSchema>;
export type CommitteeQueryInput = z.infer<typeof committeeQuerySchema>;
