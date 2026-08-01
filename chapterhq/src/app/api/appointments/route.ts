import { ZodError } from "zod";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import {
  AppointmentService,
  CommitteeNotFoundError,
  MemberNotFoundError,
  DuplicateActiveAppointmentError,
} from "@/services/appointment.service";
import { createAppointmentSchema, appointmentQuerySchema } from "@/validators/appointment.validator";

const appointmentService = new AppointmentService();

// GET /api/appointments
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();

    const { context } = await requirePermission(session.user.id, "appointments:read");

    const { searchParams } = new URL(request.url);
    const parsedQuery = appointmentQuerySchema.parse(Object.fromEntries(searchParams.entries()));

    const result = await appointmentService.getAppointments(context.organizationId, parsedQuery);

    return apiResponse.success(result);
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    return apiResponse.serverError();
  }
}

// POST /api/appointments
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();

    const { context } = await requirePermission(session.user.id, "appointments:create");

    const body = await request.json();
    const validatedData = createAppointmentSchema.parse(body);

    const appointment = await appointmentService.createAppointment(
      context.organizationId,
      validatedData,
      session.user.id
    );

    return apiResponse.created(appointment, "Appointment created successfully.");
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    if (error instanceof CommitteeNotFoundError) return apiResponse.notFound(error.message);
    if (error instanceof MemberNotFoundError) return apiResponse.notFound(error.message);
    if (error instanceof DuplicateActiveAppointmentError) return apiResponse.conflict(error.message);
    return apiResponse.serverError();
  }
}
