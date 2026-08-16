import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { CustomFormService, CustomFormNotFoundError } from "@/services/custom-form.service";
import { updateCustomFormFieldSchema } from "@/validators/custom-form.validator";

const formService = new CustomFormService();

/**
 * PATCH /api/forms/[id]/fields/[fieldId]
 * Update a form field
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; fieldId: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { context } = await requirePermission(session.user.id, "forms:update");

    const body = await request.json();
    const fieldData = updateCustomFormFieldSchema.parse(body);

    const field = await formService.updateField(
      context.organizationId,
      resolvedParams.id,
      resolvedParams.fieldId,
      session.user.id,
      fieldData
    );

    return NextResponse.json(field, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof CustomFormNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    if (error instanceof Error && error.name === "PermissionDeniedError") {
      return NextResponse.json({ message: "Permission denied." }, { status: 403 });
    }
    if (error instanceof Error && error.message.includes("Field not found")) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Invalid request." },
        { status: 400 }
      );
    }
    console.error("PATCH /api/forms/[id]/fields/[fieldId] error:", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}

/**
 * DELETE /api/forms/[id]/fields/[fieldId]
 * Delete a form field
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; fieldId: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { context } = await requirePermission(session.user.id, "forms:delete");

    await formService.deleteField(context.organizationId, resolvedParams.id, resolvedParams.fieldId, session.user.id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof CustomFormNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    if (error instanceof Error && error.name === "PermissionDeniedError") {
      return NextResponse.json({ message: "Permission denied." }, { status: 403 });
    }
    if (error instanceof Error && error.message.includes("Field not found")) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    console.error("DELETE /api/forms/[id]/fields/[fieldId] error:", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
