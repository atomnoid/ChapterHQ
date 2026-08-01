import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { MemberService, MemberNotFoundError } from "@/services/member.service";
import { updateMemberSchema } from "@/validators/member.validator";

const memberService = new MemberService();

// GET /api/members/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "members:read");

    const { id } = await params;
    const member = await memberService.getMember(id, authContext.organizationId);

    return apiResponse.success(member);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof MemberNotFoundError) {
      return apiResponse.notFound(error.message);
    }
    return apiResponse.serverError();
  }
}

// PUT /api/members/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "members:update");

    const body = await request.json();
    const validatedData = updateMemberSchema.parse(body);

    const { id } = await params;
    const updatedMember = await memberService.updateMember(
      id,
      authContext.organizationId,
      validatedData,
      session.user.id
    );

    return apiResponse.success(updatedMember, "Member updated successfully.");
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    if (error instanceof MemberNotFoundError) {
      return apiResponse.notFound(error.message);
    }
    return apiResponse.serverError();
  }
}

// DELETE /api/members/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "members:delete");

    const { id } = await params;
    await memberService.deleteMember(id, authContext.organizationId, session.user.id);

    return apiResponse.success(null, "Member deleted successfully.");
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof MemberNotFoundError) {
      return apiResponse.notFound(error.message);
    }
    return apiResponse.serverError();
  }
}
