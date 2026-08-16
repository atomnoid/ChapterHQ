import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { CustomFormService } from "@/services/custom-form.service";
import { createCustomFormSchema } from "@/validators/custom-form.validator";

const formService = new CustomFormService();

/**
 * GET /api/forms
 * List all forms in the organization
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { context } = await requirePermission(session.user.id, "forms:read");

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as "ACTIVE" | "INACTIVE" | null;
    const required = searchParams.get("required") === "true" ? true : undefined;

    const forms = await formService.listForms(context.organizationId, { status: status || undefined, required });

    return NextResponse.json(
      {
        items: forms,
        total: forms.length,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") {
      return NextResponse.json({ message: "Permission denied." }, { status: 403 });
    }
    console.error("GET /api/forms error:", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}

/**
 * POST /api/forms
 * Create a new form
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { context } = await requirePermission(session.user.id, "forms:create");

    const body = await request.json();
    const input = createCustomFormSchema.parse(body);

    const form = await formService.createForm(context.organizationId, session.user.id, input);

    return NextResponse.json(form, { status: 201 });
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
    console.error("POST /api/forms error:", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
