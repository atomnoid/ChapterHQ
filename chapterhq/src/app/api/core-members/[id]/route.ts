import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { CoreMemberService, CoreMemberNotFoundError } from "@/services/core-member.service";
import { apiResponse } from "@/lib/api-response";

const coreMemberService = new CoreMemberService();

// DELETE /api/core-members/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context } = await requirePermission(session.user.id, "members:delete");

    const { id } = await params;
    await coreMemberService.remove(id, context.organizationId, session.user.id);

    return apiResponse.success(null, "Core Member status removed successfully.");
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof CoreMemberNotFoundError) {
      return apiResponse.notFound(error.message);
    }
    return apiResponse.serverError();
  }
}
