import { z } from "zod";
import { paginationQuerySchema } from "@/lib/pagination";

export const createCertificateSchema = z.object({
  memberId: z.string().min(1, "memberId is required."),
  title: z
    .string()
    .trim()
    .min(2, "Certificate title must be at least 2 characters.")
    .max(150, "Certificate title must be 150 characters or less."),
  description: z
    .string()
    .trim()
    .max(1000, "Description must be 1000 characters or less.")
    .optional(),
  issueDate: z.coerce.date({ required_error: "issueDate is required." }),
  expiryDate: z.coerce.date().optional(),
  credentialId: z
    .string()
    .trim()
    .max(100, "Credential ID must be 100 characters or less.")
    .optional(),
  certificateUrl: z
    .string()
    .trim()
    .url("Please enter a valid URL.")
    .optional()
    .or(z.literal("")),
});

export const updateCertificateSchema = z.object({
  memberId: z.string().min(1, "memberId is required.").optional(),
  title: z
    .string()
    .trim()
    .min(2, "Certificate title must be at least 2 characters.")
    .max(150, "Certificate title must be 150 characters or less.")
    .optional(),
  description: z
    .string()
    .trim()
    .max(1000, "Description must be 1000 characters or less.")
    .optional(),
  issueDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().optional(),
  credentialId: z
    .string()
    .trim()
    .max(100, "Credential ID must be 100 characters or less.")
    .optional(),
  certificateUrl: z
    .string()
    .trim()
    .url("Please enter a valid URL.")
    .optional()
    .or(z.literal("")),
});

export const certificateQuerySchema = paginationQuerySchema;

export type CreateCertificateInput = z.infer<typeof createCertificateSchema>;
export type UpdateCertificateInput = z.infer<typeof updateCertificateSchema>;
export type CertificateQueryInput = z.infer<typeof certificateQuerySchema>;
