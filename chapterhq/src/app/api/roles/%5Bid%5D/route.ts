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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context } = await requirePermission(session.user.id, "roles:read");

    const resolvedParams = await params;
    const role = await roleService.getRole(resolvedParams.id, context.organizationId);

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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context } = await requirePermission(session.user.id, "roles:update");

    const body = await request.json();
    const validatedData = updateRoleSchema.parse(body);

    const resolvedParams = await params;
    const updatedRole = await roleService.updateRole(
      resolvedParams.id,
      context.organizationId,
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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context } = await requirePermission(session.user.id, "roles:delete");

    const resolvedParams = await params;
    await roleService.deleteRole(resolvedParams.id, context.organizationId, session.user.id);

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
