import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { CustomFormService, CustomFormNotFoundError } from "@/services/custom-form.service";
import { createCustomFormFieldSchema } from "@/validators/custom-form.validator";

const formService = new CustomFormService();

/**
 * POST /api/forms/[id]/fields
 * Add a new field to a form
 */
export async function POST(
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
    const fieldData = createCustomFormFieldSchema.parse(body);

    const field = await formService.addField(context.organizationId, resolvedParams.id, session.user.id, fieldData);

    return NextResponse.json(field, { status: 201 });
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
    console.error("POST /api/forms/[id]/fields error:", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
