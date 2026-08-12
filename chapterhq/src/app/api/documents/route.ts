import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { DocumentService } from "@/services/document.service";
import { createDocumentSchema, documentQuerySchema } from "@/validators/document.validator";

const documentService = new DocumentService();

// GET /api/documents
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "documents:read");

    const searchParams = request.nextUrl.searchParams;
    const queryInput = documentQuerySchema.parse({
      search: searchParams.get("search") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    const result = await documentService.listDocuments(authContext.organizationId, {
      ...queryInput,
      committeeId: authContext.activeCommitteeId ?? null,
    });

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

// POST /api/documents
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "documents:create");

    const body = await request.json();
    const validatedData = createDocumentSchema.parse(body);

    const document = await documentService.createDocument(
      authContext.organizationId,
      {
        ...validatedData,
        committeeId: authContext.activeCommitteeId ?? null,
      },
      session.user.id
    );

    return apiResponse.created(document, "Document uploaded successfully.");
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
