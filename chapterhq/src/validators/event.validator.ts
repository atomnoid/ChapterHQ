import { z } from "zod";
import { EventStatus } from "@prisma/client";
import { paginationQuerySchema } from "@/lib/pagination";

export const eventStatusSchema = z.nativeEnum(EventStatus);

export const createEventSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Title must be at least 2 characters.")
    .max(150, "Title must be 150 characters or less."),
  description: z
    .string()
    .trim()
    .max(2000, "Description must be 2000 characters or less.")
    .optional(),
  venue: z
    .string()
    .trim()
    .max(200, "Venue must be 200 characters or less.")
    .optional(),
  startDate: z.coerce.date({ required_error: "startDate is required." }),
  endDate: z.coerce.date().optional(),
  capacity: z
    .number()
    .int("Capacity must be a whole number.")
    .positive("Capacity must be a positive number.")
    .optional(),
  registrationRequired: z.boolean().optional().default(false),
  status: eventStatusSchema.optional().default("DRAFT"),
});

export const updateEventSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Title must be at least 2 characters.")
    .max(150, "Title must be 150 characters or less.")
    .optional(),
  description: z
    .string()
    .trim()
    .max(2000, "Description must be 2000 characters or less.")
    .optional(),
  venue: z
    .string()
    .trim()
    .max(200, "Venue must be 200 characters or less.")
    .optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  capacity: z
    .number()
    .int("Capacity must be a whole number.")
    .positive("Capacity must be a positive number.")
    .optional(),
  registrationRequired: z.boolean().optional(),
  status: eventStatusSchema.optional(),
});

export const eventQuerySchema = paginationQuerySchema.extend({
  status: eventStatusSchema.optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type EventQueryInput = z.infer<typeof eventQuerySchema>;
export type EventStatusType = EventStatus;
