import { ZodError } from "zod";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { EventService, EventNotFoundError } from "@/services/event.service";
import { updateEventSchema } from "@/validators/event.validator";

const eventService = new EventService();

// GET /api/events/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();

    const { context } = await requirePermission(session.user.id, "events:read");

    const { id } = await params;
    const event = await eventService.getEvent(id, context.organizationId);

    return apiResponse.success(event);
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof EventNotFoundError) return apiResponse.notFound(error.message);
    return apiResponse.serverError();
  }
}

// PATCH /api/events/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();

    const { context } = await requirePermission(session.user.id, "events:update");

    const body = await request.json();
    const validatedData = updateEventSchema.parse(body);

    const { id } = await params;
    const updated = await eventService.updateEvent(
      id,
      context.organizationId,
      validatedData,
      session.user.id
    );

    return apiResponse.success(updated, "Event updated successfully.");
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    if (error instanceof EventNotFoundError) return apiResponse.notFound(error.message);
    return apiResponse.serverError();
  }
}

// DELETE /api/events/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();

    const { context } = await requirePermission(session.user.id, "events:delete");

    const { id } = await params;
    await eventService.deleteEvent(id, context.organizationId, session.user.id);

    return apiResponse.success(null, "Event deleted successfully.");
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof EventNotFoundError) return apiResponse.notFound(error.message);
    return apiResponse.serverError();
  }
}
