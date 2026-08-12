import { z } from "zod";

export const createInvitationSchema = z.object({
  email: z.string().trim().email("Invalid email address."),
  roleId: z.string().trim().length(24, "Invalid role ID.").optional(),
  committeeId: z.string().trim().length(24, "Invalid committee ID.").optional(),
  emailTemplateId: z.string().trim().length(24, "Invalid email template ID.").optional(),
  expiresInDays: z
    .number()
    .int()
    .positive()
    .max(30, "Expiry cannot exceed 30 days.")
    .default(7),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
