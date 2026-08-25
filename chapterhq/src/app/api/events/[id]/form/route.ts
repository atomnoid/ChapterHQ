import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { CustomFormService, CustomFormNotFoundError } from "@/services/custom-form.service";
import { createCustomFormSchema } from "@/validators/custom-form.validator";

const formService = new CustomFormService();

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await context.params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    const { context: authContext } = await requirePermission(session.user.id, "events:read");
    const form = await formService.getEventForm(authContext.organizationId, eventId);
    if (!form) return NextResponse.json({ message: "No form configured for this event." }, { status: 404 });
    return NextResponse.json(form, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError")
      return NextResponse.json({ message: "Permission denied." }, { status: 403 });
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await context.params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    const { context: authContext } = await requirePermission(session.user.id, "events:update");
    const body = await request.json();
    const input = createCustomFormSchema.parse(body);
    const form = await formService.createEventForm(authContext.organizationId, eventId, session.user.id, input);
    return NextResponse.json(form, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError")
      return NextResponse.json({ message: "Permission denied." }, { status: 403 });
    if (error instanceof ZodError)
      return NextResponse.json({ message: error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await context.params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    const { context: authContext } = await requirePermission(session.user.id, "events:update");
    await formService.deleteEventForm(authContext.organizationId, eventId, session.user.id);
    return NextResponse.json({ message: "Form deleted." }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError")
      return NextResponse.json({ message: "Permission denied." }, { status: 403 });
    if (error instanceof CustomFormNotFoundError)
      return NextResponse.json({ message: error.message }, { status: 404 });
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await context.params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    const { context: authContext } = await requirePermission(session.user.id, "events:update");
    const body = await request.json();
    if (body.action === "delete_field" && body.fieldId) {
      const result = await formService.deleteEventFormField(authContext.organizationId, eventId, body.fieldId, session.user.id);
      return NextResponse.json(result, { status: 200 });
    }
    const field = await formService.addFieldToEventForm(authContext.organizationId, eventId, session.user.id, body);
    return NextResponse.json(field, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError")
      return NextResponse.json({ message: "Permission denied." }, { status: 403 });
    if (error instanceof CustomFormNotFoundError)
      return NextResponse.json({ message: error.message }, { status: 404 });
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
