import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { ReportService } from "@/services/report.service";

const reportService = new ReportService();

// GET /api/reports/attendance
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context } = await requirePermission(session.user.id, "reports:read");
    const report = await reportService.getAttendanceReport(context.organizationId, context.activeCommitteeId);

    return apiResponse.success(report);
  } catch (error: unknown) {
    if (error instanceof Error && error instanceof Error && error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    return apiResponse.serverError();
  }
}
