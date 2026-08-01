import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { UserRoleService, UserRoleNotFoundError } from "@/services/user-role.service";
import { MemberNotFoundError } from "@/services/member.service";

const userRoleService = new UserRoleService();

// DELETE /api/members/[id]/roles/[roleId]
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; roleId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { context: authContext } = await requirePermission(session.user.id, "roles:remove");

    const { id, roleId } = await context.params;
    await userRoleService.removeRole(
      authContext.organizationId,
      id,
      roleId
    );

    return NextResponse.json({ message: "Role removed successfully." }, { status: 200 });
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") {
      return NextResponse.json({ message: "Permission denied." }, { status: 403 });
    }
    if (error instanceof MemberNotFoundError || error instanceof UserRoleNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
