import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { NotificationService } from "@/services/notification.service";

const notificationService = new NotificationService();

// GET /api/notifications/unread-count
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();

    const { context } = await requirePermission(session.user.id, "notifications:read");

    const count = await notificationService.getUnreadCount(context.organizationId, context.activeCommitteeId ?? null);

    return apiResponse.success({ count });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") return apiResponse.forbidden();
    return apiResponse.serverError();
  }
}
