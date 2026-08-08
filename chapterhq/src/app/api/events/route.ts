import { ZodError } from "zod";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { EventService } from "@/services/event.service";
import { createEventSchema, eventQuerySchema } from "@/validators/event.validator";

const eventService = new EventService();

// GET /api/events
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();

    const { context } = await requirePermission(session.user.id, "events:read");

    const { searchParams } = new URL(request.url);
    const parsedQuery = eventQuerySchema.parse(Object.fromEntries(searchParams.entries()));

    const result = await eventService.getEvents(context.organizationId, {
      ...parsedQuery,
      committeeId: context.activeCommitteeId ?? null,
    });

    return apiResponse.success(result);
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    return apiResponse.serverError();
  }
}

// POST /api/events
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();

    const { context } = await requirePermission(session.user.id, "events:create");

    const body = await request.json();
    const validatedData = createEventSchema.parse(body);

    const event = await eventService.createEvent(
      context.organizationId,
      {
        ...validatedData,
        committeeId: context.activeCommitteeId ?? null,
      },
      session.user.id
    );

    return apiResponse.created(event, "Event created successfully.");
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    return apiResponse.serverError();
  }
}
