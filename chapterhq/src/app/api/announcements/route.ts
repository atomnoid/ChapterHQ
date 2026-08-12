import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { CMSAnnouncementService } from "@/services/cms-announcement.service";
import { createAnnouncementSchema, announcementQuerySchema } from "@/validators/cms.validator";

const announcementService = new CMSAnnouncementService();

// GET /api/announcements
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "cms:read");

    const searchParams = request.nextUrl.searchParams;
    const queryInput = announcementQuerySchema.parse({
      search: searchParams.get("search") ?? undefined,
      priority: searchParams.get("priority") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    const result = await announcementService.listAnnouncements(authContext.organizationId, queryInput);

    return apiResponse.success(result);
  } catch (error: unknown) {
    if (error instanceof Error && error instanceof Error && error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid query parameters.");
    }
    return apiResponse.serverError();
  }
}

// POST /api/announcements
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "cms:create");

    const body = await request.json();
    const validatedData = createAnnouncementSchema.parse(body);

    const announcement = await announcementService.createAnnouncement(
      authContext.organizationId,
      validatedData,
      session.user.id
    );

    return apiResponse.created(announcement, "Announcement created successfully.");
  } catch (error: unknown) {
    if (error instanceof Error && error instanceof Error && error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    return apiResponse.serverError();
  }
}
