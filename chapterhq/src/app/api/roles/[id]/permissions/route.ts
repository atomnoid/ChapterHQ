import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { PermissionService } from "@/services/permission/permission.service";
import { RoleNotFoundError } from "@/services/role.service";
import { z } from "zod";

const permissionService = new PermissionService();

const permissionPatchSchema = z.object({
  permissionIds: z.array(z.string().trim().length(24)).transform((ids) => [...new Set(ids)]),
});

// GET /api/roles/[id]/permissions
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
    const permissions = await permissionService.getRolePermissions(
      authContext.organizationId,
      id
    );

    return NextResponse.json(permissions, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error && error instanceof Error && error.name === "PermissionDeniedError") {
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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    console.log("[PermissionMatrixDebug] PATCH started");
    console.log(`[PermissionMatrixDebug] roleId: ${id}`);

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { context: authContext } = await requirePermission(session.user.id, "roles:update");
    console.log(`[PermissionMatrixDebug] organizationId: ${authContext.organizationId}`);

    const { permissionIds } = permissionPatchSchema.parse(await request.json());
    console.log("[PermissionMatrixDebug] permissionIds:", permissionIds);
    console.log(`[PermissionMatrixDebug] requested permissions count: ${permissionIds.length}`);

    const updatedPermissions = await permissionService.updateRolePermissions(
      authContext.organizationId,
      id,
      permissionIds
    );

    return NextResponse.json(
      { message: "Role permissions updated successfully.", data: updatedPermissions },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[PermissionMatrixDebug] RAW ERROR", error);
    console.error(
      "[PermissionMatrixDebug] MESSAGE",
      error instanceof Error ? error.message : String(error)
    );
    console.error(
      "[PermissionMatrixDebug] STACK",
      error instanceof Error ? error.stack : undefined
    );

    return NextResponse.json(
      {
        error: "PERMISSION_MATRIX_DEBUG",
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : undefined,
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: error instanceof RoleNotFoundError ? 404 : 500 }
    );
  }
}
