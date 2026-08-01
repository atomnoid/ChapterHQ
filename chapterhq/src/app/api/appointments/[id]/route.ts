import { ZodError } from "zod";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import {
  AppointmentService,
  AppointmentNotFoundError,
  DuplicateActiveAppointmentError,
} from "@/services/appointment.service";
import { updateAppointmentSchema } from "@/validators/appointment.validator";

const appointmentService = new AppointmentService();

// GET /api/appointments/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();

    const { context } = await requirePermission(session.user.id, "appointments:read");

    const { id } = await params;
    const appointment = await appointmentService.getAppointment(id, context.organizationId);

    return apiResponse.success(appointment);
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof AppointmentNotFoundError) return apiResponse.notFound(error.message);
    return apiResponse.serverError();
  }
}

// PATCH /api/appointments/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();

    const { context } = await requirePermission(session.user.id, "appointments:update");

    const body = await request.json();
    const validatedData = updateAppointmentSchema.parse(body);

    const { id } = await params;
    const updated = await appointmentService.updateAppointment(
      id,
      context.organizationId,
      validatedData,
      session.user.id
    );

    return apiResponse.success(updated, "Appointment updated successfully.");
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    if (error instanceof AppointmentNotFoundError) return apiResponse.notFound(error.message);
    if (error instanceof DuplicateActiveAppointmentError) return apiResponse.conflict(error.message);
    return apiResponse.serverError();
  }
}

// DELETE /api/appointments/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();

    const { context } = await requirePermission(session.user.id, "appointments:delete");

    const { id } = await params;
    await appointmentService.deleteAppointment(id, context.organizationId, session.user.id);

    return apiResponse.success(null, "Appointment deleted successfully.");
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof AppointmentNotFoundError) return apiResponse.notFound(error.message);
    return apiResponse.serverError();
  }
}
