import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { UserRoleService, UserRoleNotFoundError, InactiveRoleAssignmentError } from "@/services/user-role.service";
import { MemberNotFoundError } from "@/services/member.service";
import { RoleNotFoundError, UserRoleAlreadyExistsError } from "@/services/role.service";

const userRoleService = new UserRoleService();

// GET /api/members/[id]/roles
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { context: authContext } = await requirePermission(session.user.id, "roles:read");

    const { id } = await params;
    const roles = await userRoleService.getMemberRoles(authContext.organizationId, id);

    return NextResponse.json(roles, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error && error instanceof Error && error.name === "PermissionDeniedError") {
      return NextResponse.json({ message: "Permission denied." }, { status: 403 });
    }
    if (error instanceof MemberNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}

// POST /api/members/[id]/roles
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { context: authContext } = await requirePermission(session.user.id, "roles:assign");

    const body = await request.json();
    const { roleId } = body as { roleId?: string };
    if (!roleId) {
      return NextResponse.json({ message: "roleId is required." }, { status: 400 });
    }

    const { id } = await params;
    const userRole = await userRoleService.assignRole(
      authContext.organizationId,
      id,
      roleId
    );

    return NextResponse.json(
      { message: "Role assigned successfully.", data: userRole },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof Error && error instanceof Error && error.name === "PermissionDeniedError") {
      return NextResponse.json({ message: "Permission denied." }, { status: 403 });
    }
    if (error instanceof MemberNotFoundError || error instanceof RoleNotFoundError) {
      return NextResponse.json({ message: (error as Error).message }, { status: 404 });
    }
    if (error instanceof UserRoleAlreadyExistsError || error instanceof InactiveRoleAssignmentError) {
      return NextResponse.json({ message: (error as Error).message }, { status: 409 });
    }
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
