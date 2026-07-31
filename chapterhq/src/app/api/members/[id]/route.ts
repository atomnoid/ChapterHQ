import { ZodError } from "zod";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { MemberService, MemberNotFoundError } from "@/services/member.service";
import { updateMemberSchema } from "@/validators/member.validator";

const memberService = new MemberService();

// GET /api/members/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    // Resolve context & enforce permission
    const { context } = await requirePermission(session.user.id, "members:read");

    const resolvedParams = await params;
    const member = await memberService.getMember(resolvedParams.id, context.organizationId);

    return apiResponse.success(member);
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") {
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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    // Resolve context & enforce permission
    const { context } = await requirePermission(session.user.id, "members:update");

    const body = await request.json();
    const validatedData = updateMemberSchema.parse(body);

    const resolvedParams = await params;
    const updatedMember = await memberService.updateMember(
      resolvedParams.id,
      context.organizationId,
      validatedData
    );

    return apiResponse.success(updatedMember, "Member updated successfully.");
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") {
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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    // Resolve context & enforce permission
    const { context } = await requirePermission(session.user.id, "members:delete");

    const resolvedParams = await params;
    await memberService.deleteMember(resolvedParams.id, context.organizationId);

    return apiResponse.success(null, "Member deleted successfully.");
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof MemberNotFoundError) {
      return apiResponse.notFound(error.message);
    }
    return apiResponse.serverError();
  }
}
