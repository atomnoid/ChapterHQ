import { z } from "zod";
import { ContentStatus, PriorityLevel } from "@prisma/client";

// Page Schemas
export const createPageSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(200, "Title must be 200 characters or less."),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required.")
    .max(200, "Slug must be 200 characters or less.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must contain lowercase letters, numbers, and hyphens only."),
  content: z.string().min(1, "Content is required."),
  status: z.nativeEnum(ContentStatus).default(ContentStatus.DRAFT),
});

export const updatePageSchema = createPageSchema.partial();

export const pageQuerySchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(ContentStatus).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

// Announcement Schemas
export const createAnnouncementSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(200, "Title must be 200 characters or less."),
  content: z.string().min(1, "Content is required."),
  priority: z.nativeEnum(PriorityLevel).default(PriorityLevel.MEDIUM),
  startDate: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  endDate: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  status: z.nativeEnum(ContentStatus).default(ContentStatus.PUBLISHED),
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial();

export const announcementQuerySchema = z.object({
  search: z.string().optional(),
  priority: z.nativeEnum(PriorityLevel).optional(),
  status: z.nativeEnum(ContentStatus).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type CreatePageInput = z.infer<typeof createPageSchema>;
export type UpdatePageInput = z.infer<typeof updatePageSchema>;
export type PageQueryInput = z.infer<typeof pageQuerySchema>;

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
export type AnnouncementQueryInput = z.infer<typeof announcementQuerySchema>;
