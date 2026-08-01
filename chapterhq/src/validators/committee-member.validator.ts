import { z } from "zod";
import { paginationQuerySchema } from "@/lib/pagination";

export const assignCommitteeMemberSchema = z.object({
  memberId: z.string().min(1, "memberId is required."),
});

export const committeeMemberQuerySchema = paginationQuerySchema;

export type AssignCommitteeMemberInput = z.infer<typeof assignCommitteeMemberSchema>;
export type CommitteeMemberQueryInput = z.infer<typeof committeeMemberQuerySchema>;
