import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import {
  CertificateService,
  CertificateNotFoundError,
  DuplicateCredentialIdError,
  MemberNotFoundError,
} from "@/services/certificate.service";
import { updateCertificateSchema } from "@/validators/certificate.validator";

const certificateService = new CertificateService();

// GET /api/certificates/[id]
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();

    const { context: authContext } = await requirePermission(session.user.id, "certificates:read");

    const { id } = await context.params;
    const certificate = await certificateService.getCertificate(id, authContext.organizationId);

    return apiResponse.success(certificate);
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof CertificateNotFoundError) return apiResponse.notFound(error.message);
    return apiResponse.serverError();
  }
}

// PATCH /api/certificates/[id]
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();

    const { context: authContext } = await requirePermission(session.user.id, "certificates:update");

    const body = await request.json();
    const validatedData = updateCertificateSchema.parse(body);

    const { id } = await context.params;
    const updated = await certificateService.updateCertificate(
      id,
      authContext.organizationId,
      validatedData,
      session.user.id
    );

    return apiResponse.success(updated, "Certificate updated successfully.");
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    if (error instanceof CertificateNotFoundError) return apiResponse.notFound(error.message);
    if (error instanceof MemberNotFoundError) return apiResponse.notFound(error.message);
    if (error instanceof DuplicateCredentialIdError) return apiResponse.conflict(error.message);
    return apiResponse.serverError();
  }
}

// DELETE /api/certificates/[id]
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();

    const { context: authContext } = await requirePermission(session.user.id, "certificates:delete");

    const { id } = await context.params;
    await certificateService.deleteCertificate(id, authContext.organizationId, session.user.id);

    return apiResponse.success(null, "Certificate deleted successfully.");
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof CertificateNotFoundError) return apiResponse.notFound(error.message);
    return apiResponse.serverError();
  }
}
