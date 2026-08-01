import { z } from "zod";
import { AttendanceStatus } from "@prisma/client";
import { paginationQuerySchema } from "@/lib/pagination";

export const attendanceStatusSchema = z.nativeEnum(AttendanceStatus);

export const registerMemberSchema = z.object({
  memberId: z.string().min(1, "memberId is required."),
});

export const markAttendanceSchema = z.object({
  memberId: z.string().min(1, "memberId is required."),
  status: attendanceStatusSchema,
  notes: z.string().trim().max(500, "Notes must be 500 characters or less.").optional(),
});

export const bulkAttendanceSchema = z.object({
  items: z.array(
    z.object({
      memberId: z.string().min(1, "memberId is required."),
      status: attendanceStatusSchema,
      notes: z.string().trim().max(500, "Notes must be 500 characters or less.").optional(),
    })
  ).min(1, "At least one item is required."),
});

export const registrationQuerySchema = paginationQuerySchema;

export type RegisterMemberInput = z.infer<typeof registerMemberSchema>;
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
export type BulkAttendanceInput = z.infer<typeof bulkAttendanceSchema>;
export type RegistrationQueryInput = z.infer<typeof registrationQuerySchema>;
