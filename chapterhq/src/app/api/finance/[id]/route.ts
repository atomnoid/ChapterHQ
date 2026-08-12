import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { FinanceService, FinanceRecordNotFoundError } from "@/services/finance.service";
import { updateFinanceSchema } from "@/validators/finance.validator";

const financeService = new FinanceService();

// GET /api/finance/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "finance:read");

    const { id } = await params;
    const record = await financeService.getRecord(id, authContext.organizationId, authContext.activeCommitteeId);

    return apiResponse.success(record);
  } catch (error: unknown) {
    if (error instanceof Error && error instanceof Error && error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof FinanceRecordNotFoundError) {
      return apiResponse.notFound(error.message);
    }
    return apiResponse.serverError();
  }
}

// PATCH /api/finance/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "finance:update");

    const body = await request.json();
    const validatedData = updateFinanceSchema.parse(body);

    const { id } = await params;
    const updated = await financeService.updateRecord(
      id,
      authContext.organizationId,
      validatedData,
      session.user.id,
      authContext.activeCommitteeId
    );

    return apiResponse.success(updated, "Finance record updated successfully.");
  } catch (error: unknown) {
    if (error instanceof Error && error instanceof Error && error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    if (error instanceof FinanceRecordNotFoundError) {
      return apiResponse.notFound(error.message);
    }
    return apiResponse.serverError();
  }
}

// DELETE /api/finance/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "finance:delete");

    const { id } = await params;
    await financeService.deleteRecord(id, authContext.organizationId, session.user.id, authContext.activeCommitteeId);

    return apiResponse.success(null, "Finance record deleted successfully.");
  } catch (error: unknown) {
    if (error instanceof Error && error instanceof Error && error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof FinanceRecordNotFoundError) {
      return apiResponse.notFound(error.message);
    }
    return apiResponse.serverError();
  }
}
