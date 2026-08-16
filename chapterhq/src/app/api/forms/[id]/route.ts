import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { CustomFormService, CustomFormNotFoundError } from "@/services/custom-form.service";
import { updateCustomFormSchema } from "@/validators/custom-form.validator";
import { AuthorizationService } from "@/services/permission/authorization.service";

const formService = new CustomFormService();
const authService = new AuthorizationService();

/**
 * GET /api/forms/[id]
 * Get a single form by ID — accessible by any authenticated org member
 * (needed so members can view and fill forms, not just admins)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    // Any authenticated org member can read a form (to fill it out)
    const context = await authService.resolveContext(session.user.id);

    const form = await formService.getForm(context.organizationId, resolvedParams.id);

    return NextResponse.json(form, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof CustomFormNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    if (error instanceof Error && (error.name === "PermissionDeniedError" || error.name === "OrganizationContextNotFoundError")) {
      return NextResponse.json({ message: "Permission denied." }, { status: 403 });
    }
    console.error("GET /api/forms/[id] error:", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}

/**
 * PATCH /api/forms/[id]
 * Update a form
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { context } = await requirePermission(session.user.id, "forms:update");

    const body = await request.json();
    const input = updateCustomFormSchema.parse(body);

    const form = await formService.updateForm(context.organizationId, resolvedParams.id, session.user.id, input);

    return NextResponse.json(form, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof CustomFormNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    if (error instanceof Error && error.name === "PermissionDeniedError") {
      return NextResponse.json({ message: "Permission denied." }, { status: 403 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Invalid request." },
        { status: 400 }
      );
    }
    console.error("PATCH /api/forms/[id] error:", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}

/**
 * DELETE /api/forms/[id]
 * Delete a form (soft delete)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { context } = await requirePermission(session.user.id, "forms:delete");

    await formService.deleteForm(context.organizationId, resolvedParams.id, session.user.id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof CustomFormNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    if (error instanceof Error && error.name === "PermissionDeniedError") {
      return NextResponse.json({ message: "Permission denied." }, { status: 403 });
    }
    console.error("DELETE /api/forms/[id] error:", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
