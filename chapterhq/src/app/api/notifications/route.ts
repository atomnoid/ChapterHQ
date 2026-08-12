import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { NotificationService } from "@/services/notification.service";
import { createNotificationSchema, notificationQuerySchema } from "@/validators/notification.validator";

const notificationService = new NotificationService();

// GET /api/notifications
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();

    const { context } = await requirePermission(session.user.id, "notifications:read");

    const { searchParams } = new URL(request.url);
    const parsedQuery = notificationQuerySchema.parse(Object.fromEntries(searchParams.entries()));

    const result = await notificationService.getNotifications(
      context.organizationId,
      parsedQuery,
      context.activeCommitteeId ?? null,
      context.member.id
    );

    const notificationItems = result.items ?? [];
    console.log("[NotificationListDebug]", {
      userId: session.user.id,
      activeOrganizationId: context.organizationId,
      totalNotifications: result.total,
      unreadNotifications: notificationItems.filter((notification) => !notification.isRead).length,
      notificationIds: notificationItems.map((notification) => notification.id),
    });

    return apiResponse.success(result);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    return apiResponse.serverError();
  }
}

// POST /api/notifications
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();

    const { context, roles } = await requirePermission(session.user.id, "notifications:create");

    const body = await request.json();
    const validatedData = createNotificationSchema.parse(body);

    const notification = await notificationService.createNotification(
      context.organizationId, validatedData,
      {
        activeCommitteeId: context.activeCommitteeId ?? null,
        // Role scope is protected RBAC identity; never infer authority from a display name.
        isOrganizationAdministrator: roles.some((role) => role.scope === "ORGANIZATION"),
      }
    );

    return apiResponse.created(notification, "Notification created successfully.");
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    return apiResponse.serverError();
  }
}
