import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { DocumentService, DocumentNotFoundError } from "@/services/document.service";

const documentService = new DocumentService();

// GET /api/documents/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "documents:read");

    const { id } = await params;
    const document = await documentService.getDocument(id, authContext.organizationId, authContext.activeCommitteeId);

    return apiResponse.success(document);
  } catch (error: unknown) {
    if (error instanceof Error && error instanceof Error && error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof DocumentNotFoundError) {
      return apiResponse.notFound(error.message);
    }
    return apiResponse.serverError();
  }
}

// DELETE /api/documents/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "documents:delete");

    const { id } = await params;
    await documentService.deleteDocument(id, authContext.organizationId, session.user.id, authContext.activeCommitteeId);

    return apiResponse.success(null, "Document deleted successfully.");
  } catch (error: unknown) {
    if (error instanceof Error && error instanceof Error && error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof DocumentNotFoundError) {
      return apiResponse.notFound(error.message);
    }
    return apiResponse.serverError();
  }
}
