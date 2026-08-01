import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { EventRegistrationService, EventNotFoundError, RegistrationNotFoundError } from "@/services/event-registration.service";

const registrationService = new EventRegistrationService();

// DELETE /api/events/[id]/registrations/[memberId]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();

    const { context } = await requirePermission(session.user.id, "events:update");

    const { id: eventId, memberId } = await params;
    await registrationService.cancelRegistration(
      context.organizationId,
      eventId,
      memberId,
      session.user.id
    );

    return apiResponse.success(null, "Registration cancelled successfully.");
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof EventNotFoundError) return apiResponse.notFound(error.message);
    if (error instanceof RegistrationNotFoundError) return apiResponse.notFound(error.message);
    return apiResponse.serverError();
  }
}
