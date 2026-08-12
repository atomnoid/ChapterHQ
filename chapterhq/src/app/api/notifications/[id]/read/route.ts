import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { NotificationService, NotificationNotFoundError } from "@/services/notification.service";

const notificationService = new NotificationService();

// PATCH /api/notifications/[id]/read
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();

    const { context: authContext } = await requirePermission(session.user.id, "notifications:read");

    const { id } = await context.params;
    const notification = await notificationService.markAsRead(id, authContext.organizationId, authContext.activeCommitteeId);

    return apiResponse.success(notification, "Notification marked as read successfully.");
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof NotificationNotFoundError) return apiResponse.notFound(error.message);
    return apiResponse.serverError();
  }
}
