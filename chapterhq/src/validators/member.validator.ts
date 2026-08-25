import { z } from "zod";
import { MemberStatus } from "@prisma/client";
import { paginationQuerySchema } from "@/lib/pagination";

export const memberStatusSchema = z.nativeEnum(MemberStatus);

export const memberTypeSchema = z.enum(["ALL", "CORE", "EXTERNAL"]).default("ALL");

export const updateMemberSchema = z.object({
  status: memberStatusSchema.optional(),
});

export const memberQuerySchema = paginationQuerySchema.extend({
  status: memberStatusSchema.optional(),
  memberType: memberTypeSchema.optional(),
});

export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type MemberQueryInput = z.infer<typeof memberQuerySchema>;
export type MemberStatusType = MemberStatus;
export type MemberType = z.infer<typeof memberTypeSchema>;
