import { ZodError } from "zod";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { RoleService, DuplicateRoleNameError } from "@/services/role.service";
import { createRoleSchema, roleQuerySchema } from "@/validators/role.validator";

const roleService = new RoleService();

// GET /api/roles
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context } = await requirePermission(session.user.id, "roles:read");

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const parsedQuery = roleQuerySchema.parse(queryParams);

    const result = await roleService.getRoles({
      ...parsedQuery,
      organizationId: context.organizationId,
    });

    return apiResponse.success(result);
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    return apiResponse.serverError();
  }
}

// POST /api/roles
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context } = await requirePermission(session.user.id, "roles:create");

    const body = await request.json();
    const validatedData = createRoleSchema.parse(body);

    const createdRole = await roleService.createRole(
      context.organizationId,
      validatedData
    );

    return apiResponse.created(createdRole, "Role created successfully.");
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    if (error instanceof DuplicateRoleNameError) {
      return apiResponse.conflict(error.message);
    }
    return apiResponse.serverError();
  }
}
