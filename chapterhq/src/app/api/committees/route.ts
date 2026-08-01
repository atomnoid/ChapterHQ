import { ZodError } from "zod";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { CommitteeService, DuplicateCommitteeNameError } from "@/services/committee.service";
import { createCommitteeSchema, committeeQuerySchema } from "@/validators/committee.validator";

const committeeService = new CommitteeService();

// GET /api/committees
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context } = await requirePermission(session.user.id, "committees:read");

    const { searchParams } = new URL(request.url);
    const parsedQuery = committeeQuerySchema.parse(Object.fromEntries(searchParams.entries()));

    const result = await committeeService.getCommittees({
      ...parsedQuery,
      organizationId: context.organizationId,
    });

    return apiResponse.success(result);
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    return apiResponse.serverError();
  }
}

// POST /api/committees
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context } = await requirePermission(session.user.id, "committees:create");

    const body = await request.json();
    const validatedData = createCommitteeSchema.parse(body);

    const committee = await committeeService.createCommittee(
      context.organizationId,
      validatedData,
      session.user.id
    );

    return apiResponse.created(committee, "Committee created successfully.");
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    if (error instanceof DuplicateCommitteeNameError) {
      return apiResponse.conflict(error.message);
    }
    return apiResponse.serverError();
  }
}
