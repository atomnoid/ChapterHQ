import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { CMSPageService, PageNotFoundError, DuplicatePageSlugError } from "@/services/cms-page.service";
import { updatePageSchema } from "@/validators/cms.validator";

const pageService = new CMSPageService();

// GET /api/pages/[id]
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
    const page = await pageService.getPage(id, authContext.organizationId);

    return apiResponse.success(page);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof PageNotFoundError) {
      return apiResponse.notFound(error.message);
    }
    return apiResponse.serverError();
  }
}

// PATCH /api/pages/[id]
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
    const validatedData = updatePageSchema.parse(body);

    const { id } = await params;
    const updated = await pageService.updatePage(
      id,
      authContext.organizationId,
      validatedData,
      session.user.id
    );

    return apiResponse.success(updated, "Page updated successfully.");
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    if (error instanceof PageNotFoundError) {
      return apiResponse.notFound(error.message);
    }
    if (error instanceof DuplicatePageSlugError) {
      return apiResponse.conflict(error.message);
    }
    return apiResponse.serverError();
  }
}

// DELETE /api/pages/[id]
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
    await pageService.deletePage(id, authContext.organizationId, session.user.id);

    return apiResponse.success(null, "Page deleted successfully.");
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof PageNotFoundError) {
      return apiResponse.notFound(error.message);
    }
    return apiResponse.serverError();
  }
}
