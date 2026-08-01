import { ZodError } from "zod";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { EventRegistrationService, EventNotFoundError, MemberNotFoundError } from "@/services/event-registration.service";
import { markAttendanceSchema, bulkAttendanceSchema } from "@/validators/event-registration.validator";

const registrationService = new EventRegistrationService();

// GET /api/events/[id]/attendance
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();

    const { context } = await requirePermission(session.user.id, "events:read");

    const { id: eventId } = await params;
    const result = await registrationService.getAttendanceList(
      context.organizationId,
      eventId
    );

    return apiResponse.success(result);
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof EventNotFoundError) return apiResponse.notFound(error.message);
    return apiResponse.serverError();
  }
}

// PATCH /api/events/[id]/attendance
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();

    const { context } = await requirePermission(session.user.id, "events:update");

    const body = await request.json();
    const { id: eventId } = await params;

    // Check if it is a bulk update or single update
    if (body && Array.isArray(body.items)) {
      const { items } = bulkAttendanceSchema.parse(body);
      const result = await registrationService.bulkUpdateAttendance(
        context.organizationId,
        eventId,
        items,
        session.user.id
      );
      return apiResponse.success(result, "Attendance updated successfully.");
    } else {
      const validatedData = markAttendanceSchema.parse(body);
      const result = await registrationService.markAttendance(
        context.organizationId,
        eventId,
        validatedData,
        session.user.id
      );
      return apiResponse.success(result, "Attendance marked successfully.");
    }
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    if (error instanceof EventNotFoundError) return apiResponse.notFound(error.message);
    if (error instanceof MemberNotFoundError) return apiResponse.notFound(error.message);
    return apiResponse.serverError();
  }
}
