import { z } from "zod";
import { paginationQuerySchema } from "@/lib/pagination";

export const assignCommitteeMemberSchema = z.object({
  memberIds: z.array(z.string().min(1)).min(1, "At least one member must be selected."),
});

export const committeeMemberQuerySchema = paginationQuerySchema;

export const removeCommitteeMembersSchema = z.object({
  memberIds: z.array(z.string().min(1)).min(1, "At least one member must be selected for removal."),
});

export type AssignCommitteeMemberInput = z.infer<typeof assignCommitteeMemberSchema>;
export type RemoveCommitteeMembersInput = z.infer<typeof removeCommitteeMembersSchema>;
export type CommitteeMemberQueryInput = z.infer<typeof committeeMemberQuerySchema>;

