import { ZodError } from "zod";
import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import {
  AppointmentService,
  CommitteeNotFoundError,
  MemberNotFoundError,
  MemberNotInCommitteeError,
  DuplicateActiveAppointmentError,
} from "@/services/appointment.service";
import { createAppointmentSchema, appointmentQuerySchema } from "@/validators/appointment.validator";

const appointmentService = new AppointmentService();

// GET /api/appointments
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();

    const { context } = await requirePermission(session.user.id, "appointments:read");

    const { searchParams } = new URL(request.url);
    const parsedQuery = appointmentQuerySchema.parse(Object.fromEntries(searchParams.entries()));

    // ── V-05 fix ─────────────────────────────────────────────────────────────
    // The committee filter MUST come from the trusted server-side session context
    // (context.activeCommitteeId), NOT from the client-supplied ?committeeId= query
    // parameter. Passing activeCommitteeId to the service ensures the service
    // ignores parsedQuery.committeeId when a committee is active.
    const result = await appointmentService.getAppointments(
      context.organizationId,
      parsedQuery,
      context.activeCommitteeId,
    );

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
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();

    const { context } = await requirePermission(session.user.id, "appointments:create");

    const body = await request.json();
    const validatedData = createAppointmentSchema.parse(body);

    // ── V-04 fix ─────────────────────────────────────────────────────────────
    // The committeeId MUST come from the trusted server-side session context when
    // a committee is active. The client-supplied body.committeeId is discarded.
    // If no committee is active, fall back to the (validated) client body
    // committeeId so that admin/president org-wide flows continue to work.
    const trustedCommitteeId = context.activeCommitteeId ?? validatedData.committeeId;

    const appointment = await appointmentService.createAppointment(
      context.organizationId,
      { ...validatedData, committeeId: trustedCommitteeId },
      session.user.id,
      context.activeCommitteeId,
    );

    return apiResponse.created(appointment, "Appointment created successfully.");
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    if (error instanceof CommitteeNotFoundError) return apiResponse.notFound(error.message);
    if (error instanceof MemberNotFoundError) return apiResponse.notFound(error.message);
    if (error instanceof MemberNotInCommitteeError) return apiResponse.forbidden(error.message);
    if (error instanceof DuplicateActiveAppointmentError) return apiResponse.conflict(error.message);
    return apiResponse.serverError();
  }
}
