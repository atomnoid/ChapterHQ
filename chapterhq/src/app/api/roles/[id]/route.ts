import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { apiResponse } from "@/lib/api-response";
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

function logRoleDelete(details: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.log("[ROLE DELETE]", details);
  }
}

// GET /api/roles/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "roles:read");

    const { id } = await params;
    const role = await roleService.getRole(id, authContext.organizationId);

    return apiResponse.success(role);
  } catch (error: unknown) {
    if (error instanceof Error && error instanceof Error && error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof RoleNotFoundError) {
      return apiResponse.notFound(error.message);
    }
    return apiResponse.serverError();
  }
}

// PATCH /api/roles/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "roles:update");

    const body = await request.json();
    const validatedData = updateRoleSchema.parse(body);

    const { id } = await params;
    const updatedRole = await roleService.updateRole(
      id,
      authContext.organizationId,
      validatedData,
      session.user.id
    );

    return apiResponse.success(updatedRole, "Role updated successfully.");
  } catch (error: unknown) {
    if (error instanceof Error && error instanceof Error && error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    if (error instanceof RoleNotFoundError) {
      return apiResponse.notFound(error.message);
    }
    if (error instanceof DuplicateRoleNameError) {
      return apiResponse.conflict(error.message);
    }
    if (error instanceof ProtectedRoleModificationError) {
      return apiResponse.badRequest(error.message);
    }
    return apiResponse.serverError();
  }
}

// DELETE /api/roles/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: string | undefined;
  let organizationId: string | undefined;
  let roleId: string | undefined;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }
    userId = session.user.id;

    const { context: authContext } = await requirePermission(session.user.id, "roles:delete");
    organizationId = authContext.organizationId;

    const { id } = await params;
    roleId = id;

    logRoleDelete({
      userId,
      organizationId,
      memberId: authContext.member.id,
      roleId,
      permission: "roles:delete",
      result: "pending",
    });

    const deletedRole = await roleService.deleteRole(id, authContext.organizationId, session.user.id);

    logRoleDelete({
      userId,
      organizationId,
      memberId: authContext.member.id,
      roleId,
      result: {
        id: deletedRole.id,
        name: deletedRole.name,
        deletedAt: deletedRole.deletedAt,
      },
    });

    return apiResponse.success(null, "Role deleted successfully.");
  } catch (error: unknown) {
    logRoleDelete({
      userId,
      organizationId,
      roleId,
      result: "error",
      errorName: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof Error && error instanceof Error && error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof RoleNotFoundError) {
      return apiResponse.notFound(error.message);
    }
    if (error instanceof ProtectedRoleModificationError) {
      return apiResponse.badRequest(error.message);
    }
    return apiResponse.serverError();
  }
}
