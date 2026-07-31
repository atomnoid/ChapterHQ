import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { PermissionService } from "@/services/permission/permission.service";
import { RoleNotFoundError } from "@/services/role.service";

const permissionService = new PermissionService();

// GET /api/roles/[id]/permissions
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { context } = await requirePermission(session.user.id, "roles:read");

    const resolvedParams = await params;
    const permissions = await permissionService.getRolePermissions(
      context.organizationId,
      resolvedParams.id
    );

    return NextResponse.json(permissions, { status: 200 });
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") {
      return NextResponse.json({ message: "Permission denied." }, { status: 403 });
    }
    if (error instanceof RoleNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}

// PATCH /api/roles/[id]/permissions
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { context } = await requirePermission(session.user.id, "roles:update");

    const body = await request.json();
    const { permissionIds } = body as { permissionIds?: string[] };
    if (!permissionIds || !Array.isArray(permissionIds)) {
      return NextResponse.json(
        { message: "permissionIds must be an array of strings." },
        { status: 400 }
      );
    }

    const resolvedParams = await params;
    const updatedPermissions = await permissionService.updateRolePermissions(
      context.organizationId,
      resolvedParams.id,
      permissionIds
    );

    return NextResponse.json(
      { message: "Role permissions updated successfully.", data: updatedPermissions },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") {
      return NextResponse.json({ message: "Permission denied." }, { status: 403 });
    }
    if (error instanceof RoleNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
