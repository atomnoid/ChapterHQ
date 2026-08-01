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

// GET /api/roles/[id]
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "roles:read");

    const { id } = await context.params;
    const role = await roleService.getRole(id, authContext.organizationId);

    return apiResponse.success(role);
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") {
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
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "roles:update");

    const body = await request.json();
    const validatedData = updateRoleSchema.parse(body);

    const { id } = await context.params;
    const updatedRole = await roleService.updateRole(
      id,
      authContext.organizationId,
      validatedData,
      session.user.id
    );

    return apiResponse.success(updatedRole, "Role updated successfully.");
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") {
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
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "roles:delete");

    const { id } = await context.params;
    await roleService.deleteRole(id, authContext.organizationId, session.user.id);

    return apiResponse.success(null, "Role deleted successfully.");
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") {
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
