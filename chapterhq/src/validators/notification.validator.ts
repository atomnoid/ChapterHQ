import { z } from "zod";
import { paginationQuerySchema } from "@/lib/pagination";

export const NOTIFICATION_TYPES = ["INFO", "SUCCESS", "WARNING", "ERROR", "ANNOUNCEMENT", "SYSTEM"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const createNotificationSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Title must be at least 2 characters.")
    .max(150, "Title must be 150 characters or less."),
  message: z
    .string()
    .trim()
    .min(1, "Message is required.")
    .max(2000, "Message must be 2000 characters or less."),
  type: z
    .enum(NOTIFICATION_TYPES, { errorMap: () => ({ message: "Invalid notification type." }) })
    .default("INFO"),
  targetScope: z
    .enum(["ORGANIZATION", "COMMITTEE"], { errorMap: () => ({ message: "targetScope must be ORGANIZATION or COMMITTEE." }) })
    .default("ORGANIZATION"),
});

export const notificationQuerySchema = paginationQuerySchema.extend({
  isRead: z
    .string()
    .optional()
    .transform((val) => (val === "true" ? true : val === "false" ? false : undefined))
    .pipe(z.boolean().optional()),
  type: z.string().optional(),
  targetScope: z.string().optional(),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>;
