import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { CertificateService, DuplicateCredentialIdError, MemberNotFoundError } from "@/services/certificate.service";
import { createCertificateSchema, certificateQuerySchema } from "@/validators/certificate.validator";

const certificateService = new CertificateService();

// GET /api/certificates
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();

    const { context } = await requirePermission(session.user.id, "certificates:read");

    const { searchParams } = new URL(request.url);
    const parsedQuery = certificateQuerySchema.parse(Object.fromEntries(searchParams.entries()));

    const result = await certificateService.getCertificates(context.organizationId, parsedQuery, context.activeCommitteeId);

    return apiResponse.success(result);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof Error && error.name === "OrganizationContextNotFoundError") return apiResponse.forbidden();
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    return apiResponse.serverError();
  }
}

// POST /api/certificates
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();

    const { context } = await requirePermission(session.user.id, "certificates:create");

    const body = await request.json();
    const validatedData = createCertificateSchema.parse(body);

    // Strip empty-string optional fields so they are omitted from the document
    const cleanData = {
      memberId: validatedData.memberId,
      title: validatedData.title,
      issueDate: validatedData.issueDate,
      ...(validatedData.description?.trim() ? { description: validatedData.description.trim() } : {}),
      ...(validatedData.expiryDate ? { expiryDate: validatedData.expiryDate } : {}),
      ...(validatedData.credentialId?.trim() ? { credentialId: validatedData.credentialId.trim() } : {}),
      ...(validatedData.certificateUrl?.trim() ? { certificateUrl: validatedData.certificateUrl.trim() } : {}),
    };

    const certificate = await certificateService.createCertificate(
      context.organizationId,
      cleanData,
      session.user.id
    );

    return apiResponse.created(certificate, "Certificate created successfully.");
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof Error && error.name === "OrganizationContextNotFoundError") return apiResponse.forbidden();
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    if (error instanceof MemberNotFoundError) return apiResponse.notFound(error.message);
    if (error instanceof DuplicateCredentialIdError) return apiResponse.conflict(error.message);
    // Safety net: Prisma unique constraint violation on credentialId
    if (error && typeof error === "object" && "code" in error && (error as { code: unknown }).code === "P2002") {
      return apiResponse.conflict("A certificate with this Credential ID already exists in this organization.");
    }
    const errMsg = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.error("[POST /api/certificates] Unexpected error:", error);
    return process.env.NODE_ENV === "development"
      ? apiResponse.serverError(`Unexpected error — ${errMsg}`)
      : apiResponse.serverError();
  }
}
