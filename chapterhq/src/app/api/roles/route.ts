import { NextResponse } from "next/server";
import { ZodError } from "zod";
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
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { context } = await requirePermission(session.user.id, "roles:read");

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const parsedQuery = roleQuerySchema.parse(queryParams);

    const result = await roleService.getRoles({
      ...parsedQuery,
      organizationId: context.organizationId,
    });

    return NextResponse.json(result, { status: 200 });
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
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}

// POST /api/roles
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { context } = await requirePermission(session.user.id, "roles:create");

    const body = await request.json();
    const validatedData = createRoleSchema.parse(body);

    const createdRole = await roleService.createRole(
      context.organizationId,
      validatedData
    );

    return NextResponse.json(
      { message: "Role created successfully.", data: createdRole },
      { status: 201 }
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
    if (error instanceof DuplicateRoleNameError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
