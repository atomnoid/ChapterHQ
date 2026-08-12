import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { RoleService, DuplicateRoleNameError } from "@/services/role.service";
import { createRoleSchema, roleQuerySchema } from "@/validators/role.validator";

const roleService = new RoleService();

function logRoleCreate(details: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.log("[ROLE CREATE]", details);
  }
}

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
      activeCommitteeId: context.activeCommitteeId,
    });

    return apiResponse.success(result);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") {
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
  let body: unknown;
  let userId: string | undefined;
  let organizationId: string | undefined;
  let memberId: string | undefined;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }
    userId = session.user.id;

    body = await request.json();
    logRoleCreate({
      userId,
      request: body,
      validation: "pending",
      authorization: "pending",
    });

    const validatedData = createRoleSchema.parse(body);
    logRoleCreate({
      userId,
      request: validatedData,
      validation: "pass",
      authorization: "pending",
    });

    const { context } = await requirePermission(session.user.id, "roles:create");
    organizationId = context.organizationId;
    memberId = context.member.id;
    logRoleCreate({
      userId,
      organizationId,
      memberId,
      permission: "roles:create",
      request: validatedData,
      validation: "pass",
      authorization: "pass",
    });

    const createdRole = await roleService.createRole(
      context.organizationId,
      validatedData,
      session.user.id,
      context.activeCommitteeId
    );

    logRoleCreate({
      userId,
      organizationId,
      memberId,
      permission: "roles:create",
      result: { id: createdRole.id, name: createdRole.name, scope: createdRole.scope },
    });

    return apiResponse.created(createdRole, "Role created successfully.");
  } catch (error: unknown) {
    logRoleCreate({
      userId,
      organizationId,
      memberId,
      permission: "roles:create",
      request: body,
      result: "error",
      errorName: error instanceof Error ? error.name : typeof error,
      errorCode: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof Error && error.name === "PermissionDeniedError") {
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
