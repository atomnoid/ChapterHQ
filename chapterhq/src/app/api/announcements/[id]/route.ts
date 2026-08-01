import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { CMSAnnouncementService, AnnouncementNotFoundError } from "@/services/cms-announcement.service";
import { updateAnnouncementSchema } from "@/validators/cms.validator";

const announcementService = new CMSAnnouncementService();

// GET /api/announcements/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "cms:read");

    const { id } = await params;
    const announcement = await announcementService.getAnnouncement(id, authContext.organizationId);

    return apiResponse.success(announcement);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof AnnouncementNotFoundError) {
      return apiResponse.notFound(error.message);
    }
    return apiResponse.serverError();
  }
}

// PATCH /api/announcements/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "cms:update");

    const body = await request.json();
    const validatedData = updateAnnouncementSchema.parse(body);

    const { id } = await params;
    const updated = await announcementService.updateAnnouncement(
      id,
      authContext.organizationId,
      validatedData,
      session.user.id
    );

    return apiResponse.success(updated, "Announcement updated successfully.");
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    if (error instanceof AnnouncementNotFoundError) {
      return apiResponse.notFound(error.message);
    }
    return apiResponse.serverError();
  }
}

// DELETE /api/announcements/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "cms:delete");

    const { id } = await params;
    await announcementService.deleteAnnouncement(id, authContext.organizationId, session.user.id);

    return apiResponse.success(null, "Announcement deleted successfully.");
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof AnnouncementNotFoundError) {
      return apiResponse.notFound(error.message);
    }
    return apiResponse.serverError();
  }
}
