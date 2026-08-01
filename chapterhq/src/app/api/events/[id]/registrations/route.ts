import { ZodError } from "zod";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { EventRegistrationService, EventNotFoundError, MemberNotFoundError, RegistrationLimitExceededError } from "@/services/event-registration.service";
import { registerMemberSchema, registrationQuerySchema } from "@/validators/event-registration.validator";

const registrationService = new EventRegistrationService();

// GET /api/events/[id]/registrations
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();

    const { context } = await requirePermission(session.user.id, "events:read");

    const { searchParams } = new URL(request.url);
    const parsedQuery = registrationQuerySchema.parse(Object.fromEntries(searchParams.entries()));

    const { id: eventId } = await params;
    const result = await registrationService.getRegistrations(
      context.organizationId,
      eventId,
      parsedQuery
    );

    return apiResponse.success(result);
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    if (error instanceof EventNotFoundError) {
      return apiResponse.notFound(error.message);
    }
    return apiResponse.serverError();
  }
}

// POST /api/events/[id]/registrations
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();

    // Reusing events:update permission to register a member
    const { context } = await requirePermission(session.user.id, "events:update");

    const body = await request.json();
    const { memberId } = registerMemberSchema.parse(body);

    const { id: eventId } = await params;
    const registration = await registrationService.registerMember(
      context.organizationId,
      eventId,
      memberId,
      session.user.id
    );

    return apiResponse.created(registration, "Member registered to event successfully.");
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    if (error instanceof EventNotFoundError) return apiResponse.notFound(error.message);
    if (error instanceof MemberNotFoundError) return apiResponse.notFound(error.message);
    if (error instanceof RegistrationLimitExceededError) return apiResponse.conflict(error.message);
    return apiResponse.serverError();
  }
}
