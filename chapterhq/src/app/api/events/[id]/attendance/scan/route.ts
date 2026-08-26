import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { z } from "zod";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import {
  EventRegistrationService,
  EventNotFoundError,
  InvalidTokenError,
  AttendanceAlreadyMarkedError,
} from "@/services/event-registration.service";

const registrationService = new EventRegistrationService();

const scanSchema = z.object({
  token: z.string().min(1, "token is required."),
});

/**
 * POST /api/events/[id]/attendance/scan
 * Coordinator QR scan endpoint.
 * Verifies token, checks all conditions, marks attendance PRESENT.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();

    const { context: authContext } = await requirePermission(session.user.id, "events:update");

    const body = await request.json();
    const { token } = scanSchema.parse(body);

    const { id: eventId } = await context.params;

    const result = await registrationService.processQrCheckIn(
      authContext.organizationId,
      eventId,
      token,
      session.user.id,
      authContext.activeCommitteeId
    );

    return apiResponse.success(
      {
        participantName: result.participantName,
        participantType: result.participantType,
        status: result.attendance.status,
        markedAt: result.attendance.markedAt,
        customAnswers: result.customAnswers,
        phone: (result as any).phone,
        usn: (result as any).usn,
      },
      `Attendance marked successfully. Welcome, ${result.participantName}!`
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    if (error instanceof EventNotFoundError) return apiResponse.notFound(error.message);
    if (error instanceof InvalidTokenError) {
      return apiResponse.badRequest(error.message);
    }
    if (error instanceof AttendanceAlreadyMarkedError) {
      // 409 Conflict — already checked in, not an error per se
      return apiResponse.conflict(error.message);
    }
    return apiResponse.serverError();
  }
}
