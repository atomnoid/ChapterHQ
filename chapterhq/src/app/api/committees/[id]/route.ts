import { ZodError } from "zod";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import {
  CommitteeService,
  CommitteeNotFoundError,
  DuplicateCommitteeNameError,
} from "@/services/committee.service";
import { updateCommitteeSchema } from "@/validators/committee.validator";

const committeeService = new CommitteeService();

// GET /api/committees/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context } = await requirePermission(session.user.id, "committees:read");

    const resolvedParams = await params;
    const committee = await committeeService.getCommittee(
      resolvedParams.id,
      context.organizationId
    );

    return apiResponse.success(committee);
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof CommitteeNotFoundError) {
      return apiResponse.notFound(error.message);
    }
    return apiResponse.serverError();
  }
}

// PATCH /api/committees/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context } = await requirePermission(session.user.id, "committees:update");

    const body = await request.json();
    const validatedData = updateCommitteeSchema.parse(body);

    const resolvedParams = await params;
    const updated = await committeeService.updateCommittee(
      resolvedParams.id,
      context.organizationId,
      validatedData,
      session.user.id
    );

    return apiResponse.success(updated, "Committee updated successfully.");
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    if (error instanceof CommitteeNotFoundError) {
      return apiResponse.notFound(error.message);
    }
    if (error instanceof DuplicateCommitteeNameError) {
      return apiResponse.conflict(error.message);
    }
    return apiResponse.serverError();
  }
}

// DELETE /api/committees/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context } = await requirePermission(session.user.id, "committees:delete");

    const resolvedParams = await params;
    await committeeService.deleteCommittee(
      resolvedParams.id,
      context.organizationId,
      session.user.id
    );

    return apiResponse.success(null, "Committee deleted successfully.");
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof CommitteeNotFoundError) {
      return apiResponse.notFound(error.message);
    }
    return apiResponse.serverError();
  }
}
