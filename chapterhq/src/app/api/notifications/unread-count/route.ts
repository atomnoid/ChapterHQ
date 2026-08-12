import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permission-enforcer";
import { NotificationService } from "@/services/notification.service";

const notificationService = new NotificationService();

// GET /api/notifications/unread-count
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();

    const { context } = await requirePermission(session.user.id, "notifications:read");

    const count = await notificationService.getUnreadCount(
      context.organizationId,
      context.activeCommitteeId ?? null,
      context.member.id
    );

    const [totalNotifications, unreadNotifications] = await Promise.all([
      prisma.notification.count({
        where: {
          organizationId: context.organizationId,
          recipients: { some: { memberId: context.member.id } },
        },
      }),
      prisma.notification.findMany({
        where: {
          organizationId: context.organizationId,
          isRead: false,
          recipients: { some: { memberId: context.member.id } },
          ...(context.activeCommitteeId
            ? {
                OR: [
                  { targetCommitteeId: context.activeCommitteeId },
                  { targetCommitteeId: null },
                ],
              }
            : {}),
        },
        select: { id: true },
      }),
    ]);

    console.log("[NotificationDebug]", {
      userId: session.user.id,
      activeOrganizationId: context.organizationId,
      totalNotifications,
      unreadNotifications: unreadNotifications.length,
      notificationIds: unreadNotifications.map((notification) => notification.id),
    });

    return apiResponse.success({ count });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") return apiResponse.forbidden();
    return apiResponse.serverError();
  }
}
