import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { RoleService, RoleNotFoundError, DuplicateRoleNameError } from "@/services/role.service";
import { z } from "zod";

const roleService = new RoleService();

const duplicateRoleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Role name must be at least 2 characters.")
    .max(50, "Role name must be 50 characters or less."),
  description: z.string().trim().max(200, "Description must be 200 characters or less.").optional(),
});

// POST /api/roles/[id]/duplicate
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { context: authContext } = await requirePermission(session.user.id, "roles:create");

    const body = await request.json();
    const validatedData = duplicateRoleSchema.parse(body);

    const { id } = await params;
    const duplicatedRole = await roleService.duplicateRole(
      id,
      authContext.organizationId,
      validatedData
    );

    return NextResponse.json(
      { message: "Role duplicated successfully.", data: duplicatedRole },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") {
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
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
