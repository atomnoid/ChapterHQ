import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { EventService, EventNotFoundError } from "@/services/event.service";
import { updateEventSchema } from "@/validators/event.validator";

const eventService = new EventService();

// GET /api/events/[id]
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();

    const { context: authContext } = await requirePermission(session.user.id, "events:read");

    const { id } = await context.params;
    const event = await eventService.getEvent(id, authContext.organizationId, authContext.activeCommitteeId);

    return apiResponse.success(event);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof EventNotFoundError) return apiResponse.notFound(error.message);
    return apiResponse.serverError();
  }
}

// PATCH /api/events/[id]
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();

    const { context: authContext } = await requirePermission(session.user.id, "events:update");

    const body = await request.json();
    const validatedData = updateEventSchema.parse(body);

    const { id } = await context.params;
    const updated = await eventService.updateEvent(
      id,
      authContext.organizationId,
      validatedData,
      session.user.id,
      authContext.activeCommitteeId
    );

    return apiResponse.success(updated, "Event updated successfully.");
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    if (error instanceof EventNotFoundError) return apiResponse.notFound(error.message);
    return apiResponse.serverError();
  }
}

// DELETE /api/events/[id]
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();

    const { context: authContext } = await requirePermission(session.user.id, "events:delete");

    const { id } = await context.params;
    await eventService.deleteEvent(id, authContext.organizationId, session.user.id, authContext.activeCommitteeId);

    return apiResponse.success(null, "Event deleted successfully.");
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof EventNotFoundError) return apiResponse.notFound(error.message);
    return apiResponse.serverError();
  }
}
