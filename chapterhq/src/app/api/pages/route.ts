import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { CMSPageService, DuplicatePageSlugError } from "@/services/cms-page.service";
import { createPageSchema, pageQuerySchema } from "@/validators/cms.validator";

const pageService = new CMSPageService();

// GET /api/pages
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "cms:read");

    const searchParams = request.nextUrl.searchParams;
    const queryInput = pageQuerySchema.parse({
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    const result = await pageService.listPages(authContext.organizationId, queryInput);

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

// POST /api/pages
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "cms:create");

    const body = await request.json();
    const validatedData = createPageSchema.parse(body);

    const page = await pageService.createPage(
      authContext.organizationId,
      validatedData,
      session.user.id
    );

    return apiResponse.created(page, "Page created successfully.");
  } catch (error: unknown) {
    if (error instanceof Error && error instanceof Error && error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    if (error instanceof DuplicatePageSlugError) {
      return apiResponse.conflict(error.message);
    }
    return apiResponse.serverError();
  }
}
