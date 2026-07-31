import { z } from "zod";
import { MemberStatus } from "@prisma/client";

export const memberStatusSchema = z.nativeEnum(MemberStatus);

export const updateMemberSchema = z.object({
  status: memberStatusSchema.optional(),
});

export const memberQuerySchema = z.object({
  search: z.string().optional(),
  status: memberStatusSchema.optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().positive()),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .pipe(z.number().int().positive()),
});

export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type MemberQueryInput = z.infer<typeof memberQuerySchema>;
export type MemberStatusType = MemberStatus;
