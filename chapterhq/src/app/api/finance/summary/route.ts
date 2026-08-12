import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { FinanceService } from "@/services/finance.service";

const financeService = new FinanceService();

// GET /api/finance/summary
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "finance:read");

    const summary = await financeService.getSummary(
      authContext.organizationId,
      authContext.activeCommitteeId
    );

    return apiResponse.success(summary);
  } catch (error: unknown) {
    if (error instanceof Error && error instanceof Error && error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    return apiResponse.serverError();
  }
}
