import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { NotificationService, NotificationNotFoundError } from "@/services/notification.service";

const notificationService = new NotificationService();

// DELETE /api/notifications/[id]
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();

    const { context: authContext } = await requirePermission(session.user.id, "notifications:read");

    const { id } = await context.params;
    await notificationService.deleteNotification(id, authContext.organizationId, authContext.activeCommitteeId);

    return apiResponse.success(null, "Notification deleted successfully.");
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof NotificationNotFoundError) return apiResponse.notFound(error.message);
    return apiResponse.serverError();
  }
}
