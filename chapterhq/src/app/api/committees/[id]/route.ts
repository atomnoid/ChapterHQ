import { NextRequest } from "next/server";
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
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "committees:read");

    const { id } = await context.params;
    const committee = await committeeService.getCommittee(
      id,
      authContext.organizationId
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
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "committees:update");

    const body = await request.json();
    const validatedData = updateCommitteeSchema.parse(body);

    const { id } = await context.params;
    const updated = await committeeService.updateCommittee(
      id,
      authContext.organizationId,
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
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "committees:delete");

    const { id } = await context.params;
    await committeeService.deleteCommittee(
      id,
      authContext.organizationId,
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
