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
      context.activeCommitteeId ?? null
    );

    return apiResponse.success(result);
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") return apiResponse.forbidden();
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

    const { context } = await requirePermission(session.user.id, "notifications:create");

    const body = await request.json();
    const validatedData = createNotificationSchema.parse(body);

    const notification = await notificationService.createNotification(
      context.organizationId,
      {
        ...validatedData,
        targetCommitteeId: context.activeCommitteeId ?? null,
      }
    );

    return apiResponse.created(notification, "Notification created successfully.");
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    return apiResponse.serverError();
  }
}
