import { z } from "zod";

export const emailTemplateTypeSchema = z.enum([
  "ORGANIZATION_INVITATION",
  "APPOINTMENT_CREATED",
  "CERTIFICATE_ISSUED",
  "MANUAL",
  "EVENT_REMINDER",
]);

export const createEmailTemplateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  subject: z.string().trim().min(2).max(200),
  bodyHtml: z.string().trim().min(1).max(20000),
  type: emailTemplateTypeSchema,
  isActive: z.boolean().optional().default(false),
});

export const updateEmailTemplateSchema = createEmailTemplateSchema.partial();

export const emailTemplateQuerySchema = z.object({
  search: z.string().trim().optional().default(""),
  type: emailTemplateTypeSchema.optional(),
});

export const manualEmailSchema = z.object({
  memberIds: z.array(z.string().trim().length(24)).min(1, "Select at least one recipient."),
  templateId: z.string().trim().length(24, "Select a valid template."),
});

export const bulkInvitationSchema = z.object({
  rows: z.array(z.object({
    email: z.string().trim().email("Invalid email address."),
    name: z.string().trim().optional(),
    roleId: z.string().trim().length(24).optional(),
    committeeId: z.string().trim().length(24).optional(),
  })).min(1),
  emailTemplateId: z.string().trim().length(24).optional(),
  expiresInDays: z.number().int().positive().max(30).default(7),
});
