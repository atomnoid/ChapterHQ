import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import {
  RoleService,
  RoleNotFoundError,
  DuplicateRoleNameError,
  ProtectedRoleModificationError,
} from "@/services/role.service";
import { updateRoleSchema } from "@/validators/role.validator";

const roleService = new RoleService();

// GET /api/roles/[id]
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
    const role = await roleService.getRole(resolvedParams.id, context.organizationId);

    return NextResponse.json(role, { status: 200 });
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

// PATCH /api/roles/[id]
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
    const validatedData = updateRoleSchema.parse(body);

    const resolvedParams = await params;
    const updatedRole = await roleService.updateRole(
      resolvedParams.id,
      context.organizationId,
      validatedData
    );

    return NextResponse.json(
      { message: "Role updated successfully.", data: updatedRole },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") {
      return NextResponse.json({ message: "Permission denied." }, { status: 403 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Invalid request." },
        { status: 400 }
      );
    }
    if (error instanceof RoleNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    if (error instanceof DuplicateRoleNameError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    if (error instanceof ProtectedRoleModificationError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}

// DELETE /api/roles/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { context } = await requirePermission(session.user.id, "roles:delete");

    const resolvedParams = await params;
    await roleService.deleteRole(resolvedParams.id, context.organizationId);

    return NextResponse.json({ message: "Role deleted successfully." }, { status: 200 });
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") {
      return NextResponse.json({ message: "Permission denied." }, { status: 403 });
    }
    if (error instanceof RoleNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    if (error instanceof ProtectedRoleModificationError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
