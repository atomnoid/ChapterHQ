import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { EventRegistrationService, EventNotFoundError, MemberNotFoundError } from "@/services/event-registration.service";
import { markAttendanceSchema, bulkAttendanceSchema } from "@/validators/event-registration.validator";

const registrationService = new EventRegistrationService();

// GET /api/events/[id]/attendance
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();

    const { context: authContext } = await requirePermission(session.user.id, "events:read");

    const { id: eventId } = await context.params;

    // Check if the client wants the combined view (member + external)
    const { searchParams } = new URL(request.url);
    const combined = searchParams.get("combined") === "true";

    if (combined) {
      const result = await registrationService.getCombinedAttendanceData(
        authContext.organizationId,
        eventId,
        authContext.activeCommitteeId
      );
      return apiResponse.success(result);
    }

    const result = await registrationService.getAttendanceList(
      authContext.organizationId,
      eventId,
      authContext.activeCommitteeId
    );

    return apiResponse.success(result);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof EventNotFoundError) return apiResponse.notFound(error.message);
    return apiResponse.serverError();
  }
}


// PATCH /api/events/[id]/attendance
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();

    const { context: authContext } = await requirePermission(session.user.id, "events:update");

    const body = await request.json();
    const { id: eventId } = await context.params;

    // Check if it is a bulk update or single update
    if (body && Array.isArray(body.items)) {
      const { items } = bulkAttendanceSchema.parse(body);
      const result = await registrationService.bulkUpdateAttendance(
        authContext.organizationId,
        eventId,
        items,
        session.user.id,
        authContext.activeCommitteeId
      );
      return apiResponse.success(result, "Attendance updated successfully.");
    } else {
      const validatedData = markAttendanceSchema.parse(body);
      const result = await registrationService.markAttendance(
        authContext.organizationId,
        eventId,
        validatedData,
        session.user.id,
        authContext.activeCommitteeId
      );
      return apiResponse.success(result, "Attendance marked successfully.");
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    if (error instanceof EventNotFoundError) return apiResponse.notFound(error.message);
    if (error instanceof MemberNotFoundError) return apiResponse.notFound(error.message);
    return apiResponse.serverError();
  }
}

// DELETE /api/events/[id]/attendance
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();

    const { context: authContext } = await requirePermission(session.user.id, "events:update");

    const body = await request.json();
    const { id: eventId } = await context.params;
    const { memberIds } = body;

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return apiResponse.badRequest("memberIds array is required.");
    }

    const result = await registrationService.bulkDeleteAttendance(
      authContext.organizationId,
      eventId,
      memberIds,
      authContext.activeCommitteeId
    );
    return apiResponse.success(result, "Attendance records deleted successfully.");
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof EventNotFoundError) return apiResponse.notFound(error.message);
    return apiResponse.serverError();
  }
}
