import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { AuditLogService } from "@/services/audit-log.service";
import { paginationQuerySchema } from "@/lib/pagination";
import { ZodError } from "zod";

const auditLogService = new AuditLogService();

// GET /api/audit-logs
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context } = await requirePermission(session.user.id, "audit-logs:read");

    const { searchParams } = new URL(request.url);
    const parsedQuery = paginationQuerySchema.parse(Object.fromEntries(searchParams.entries()));

    const result = await auditLogService.getLogs({
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
