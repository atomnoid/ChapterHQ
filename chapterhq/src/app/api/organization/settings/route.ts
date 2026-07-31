import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import {
  OrganizationService,
  OrganizationNotFoundError,
  OrganizationAlreadyExistsError,
} from "@/services/organization.service";
import {
  updateOrganizationSchema,
} from "@/validators/organization.validator";
import { OrganizationContextService } from "@/services/session/organization-context.service";

const organizationService = new OrganizationService();
const contextService = new OrganizationContextService();

// GET /api/organization/settings
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    // Resolve organization context — no special permission needed beyond membership
    const context = await contextService.resolve(session.user.id);
    const organization = await organizationService.getOrganizationById(context.organizationId);

    if (!organization) {
      return NextResponse.json({ message: "Organization not found." }, { status: 404 });
    }

    return NextResponse.json(organization, { status: 200 });
  } catch (error: any) {
    if (error.name === "OrganizationContextNotFoundError") {
      return NextResponse.json({ message: "No active organization found." }, { status: 404 });
    }
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}

// PATCH /api/organization/settings
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { context } = await requirePermission(session.user.id, "settings:update");

    const body = await request.json();
    const validatedData = updateOrganizationSchema.parse(body);

    const updated = await organizationService.updateSettings(
      context.organizationId,
      validatedData
    );

    return NextResponse.json(
      { message: "Organization settings updated successfully.", data: updated },
      { status: 200 }
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
    if (error instanceof OrganizationNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    if (error instanceof OrganizationAlreadyExistsError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
