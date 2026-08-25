import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import {
  EventRegistrationService,
  EventNotFoundError,
} from "@/services/event-registration.service";

const registrationService = new EventRegistrationService();

const querySchema = z.object({
  memberIds: z.string().optional(), // comma-separated
  externalIds: z.string().optional(), // comma-separated
});

/**
 * GET /api/events/[id]/attendance/export
 * Download attendance data as CSV.
 * Query params: memberIds, externalIds (comma-separated; if omitted, export all)
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();

    const { context: authContext } = await requirePermission(session.user.id, "events:read");

    const { id: eventId } = await context.params;

    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const { memberIds: memberIdsStr, externalIds: externalIdsStr } = querySchema.parse(searchParams);

    const selectedMemberIds = memberIdsStr ? memberIdsStr.split(",").filter(Boolean) : undefined;
    const selectedExternalIds = externalIdsStr ? externalIdsStr.split(",").filter(Boolean) : undefined;

    const csv = await registrationService.exportAttendanceCsv(
      authContext.organizationId,
      eventId,
      selectedMemberIds,
      selectedExternalIds,
      authContext.activeCommitteeId
    );

    const filename = `attendance-${eventId}-${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof EventNotFoundError) return apiResponse.notFound(error.message);
    return apiResponse.serverError();
  }
}
