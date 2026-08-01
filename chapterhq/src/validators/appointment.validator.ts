import { z } from "zod";
import { AppointmentStatus } from "@prisma/client";
import { paginationQuerySchema } from "@/lib/pagination";

export const appointmentStatusSchema = z.nativeEnum(AppointmentStatus);

export const createAppointmentSchema = z.object({
  committeeId: z.string().min(1, "committeeId is required."),
  memberId: z.string().min(1, "memberId is required."),
  designation: z
    .string()
    .trim()
    .min(2, "Designation must be at least 2 characters.")
    .max(100, "Designation must be 100 characters or less."),
  startDate: z.coerce.date({ required_error: "startDate is required." }),
  endDate: z.coerce.date().optional(),
  status: appointmentStatusSchema.optional(),
});

export const updateAppointmentSchema = z.object({
  designation: z
    .string()
    .trim()
    .min(2, "Designation must be at least 2 characters.")
    .max(100, "Designation must be 100 characters or less.")
    .optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: appointmentStatusSchema.optional(),
});

export const appointmentQuerySchema = paginationQuerySchema.extend({
  committeeId: z.string().optional(),
  memberId: z.string().optional(),
  status: appointmentStatusSchema.optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type AppointmentQueryInput = z.infer<typeof appointmentQuerySchema>;
export type AppointmentStatusType = AppointmentStatus;
