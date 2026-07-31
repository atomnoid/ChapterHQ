import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { DashboardService } from "@/services/dashboard.service";

const dashboardService = new DashboardService();

// GET /api/dashboard/activity
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { context } = await requirePermission(session.user.id, "dashboard:read");

    const activities = await dashboardService.getActivity(context.organizationId);

    return NextResponse.json(activities, { status: 200 });
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") {
      return NextResponse.json({ message: "Permission denied." }, { status: 403 });
    }
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
