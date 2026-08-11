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
    .enum(NOTIFICATION_TYPES, { error: "Invalid notification type." })
    .default("INFO"),
  // targetScope/memberIds are retained as backwards-compatible aliases for the
  // original UI. The API's canonical audience contract is targetType + recipientMode.
  targetType: z.enum(["ORGANIZATION", "COMMITTEE"]).optional(),
  committeeId: z.string().min(1).optional(),
  recipientMode: z.enum(["ALL", "SPECIFIC_MEMBERS"]).optional(),
  recipientIds: z.array(z.string().min(1)).min(1, "Select at least one member.").optional(),
  targetScope: z.enum(["ORGANIZATION", "COMMITTEE", "MEMBERS"]).optional(),
  targetCommitteeId: z.string().min(1).optional(),
  memberIds: z.array(z.string().min(1)).min(1, "Select at least one member.").optional(),
}).superRefine((data, ctx) => {
  const targetType = data.targetType ?? (data.targetScope === "MEMBERS" ? "COMMITTEE" : data.targetScope ?? "ORGANIZATION");
  const recipientMode = data.recipientMode ?? (data.targetScope === "MEMBERS" ? "SPECIFIC_MEMBERS" : "ALL");
  if (recipientMode === "SPECIFIC_MEMBERS" && !(data.recipientIds ?? data.memberIds)?.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["recipientIds"], message: "Select at least one member." });
  }
  if (targetType === "COMMITTEE" && !(data.committeeId ?? data.targetCommitteeId)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["committeeId"], message: "A committee is required." });
  }
}).transform((data) => ({
  title: data.title, message: data.message, type: data.type,
  targetScope: data.targetType ?? (data.targetScope === "MEMBERS" ? "COMMITTEE" : data.targetScope ?? "ORGANIZATION"),
  targetCommitteeId: data.committeeId ?? data.targetCommitteeId,
  recipientMode: data.recipientMode ?? (data.targetScope === "MEMBERS" ? "SPECIFIC_MEMBERS" : "ALL"),
  memberIds: data.recipientIds ?? data.memberIds,
}));

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
