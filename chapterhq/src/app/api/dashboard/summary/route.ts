import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { DashboardService } from "@/services/dashboard.service";

const dashboardService = new DashboardService();

// GET /api/dashboard/summary
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    // Require dashboard.read (or dynamic resource:action equivalent) permission
    const { context } = await requirePermission(session.user.id, "dashboard:read");

    const summary = await dashboardService.getSummary(
      context.organizationId,
      context.member.id,
      context.activeCommitteeId ?? null
    );

    return NextResponse.json(summary, { status: 200 });
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") {
      return NextResponse.json({ message: "Permission denied." }, { status: 403 });
    }
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
