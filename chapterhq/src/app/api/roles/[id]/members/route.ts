import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { MemberNotFoundError } from "@/services/member.service";
import { RoleNotFoundError, UserRoleAlreadyExistsError } from "@/services/role.service";
import { UserRoleService, UserRoleNotFoundError, InactiveRoleAssignmentError } from "@/services/user-role.service";

const userRoleService = new UserRoleService();

const memberIdsSchema = z.object({
  memberIds: z.array(z.string().trim().min(1)).min(1),
});

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
    const members = await userRoleService.getRoleMembers(authContext.organizationId, id);

    return NextResponse.json(members, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") {
      return NextResponse.json({ message: "Permission denied." }, { status: 403 });
    }
    if (error instanceof RoleNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}

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
    const { id } = await params;
    const { memberIds } = memberIdsSchema.parse(await request.json());

    const result = await userRoleService.assignMembersToRole(authContext.organizationId, id, memberIds);
    return NextResponse.json({ message: "Members assigned successfully.", data: result }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") {
      return NextResponse.json({ message: "Permission denied." }, { status: 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { context: authContext } = await requirePermission(session.user.id, "roles:remove");
    const { id } = await params;
    const { memberIds } = memberIdsSchema.parse(await request.json());

    const result = await userRoleService.removeMembersFromRole(authContext.organizationId, id, memberIds);
    return NextResponse.json({ message: "Members removed successfully.", data: result }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") {
      return NextResponse.json({ message: "Permission denied." }, { status: 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
    }
    if (error instanceof MemberNotFoundError || error instanceof UserRoleNotFoundError) {
      return NextResponse.json({ message: (error as Error).message }, { status: 404 });
    }
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
