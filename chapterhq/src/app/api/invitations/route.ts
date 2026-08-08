import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import {
  InvitationService,
  DuplicatePendingInvitationError,
} from "@/services/invitation.service";
import { RoleNotFoundError } from "@/services/role.service";
import { createInvitationSchema } from "@/validators/invitation.validator";

const invitationService = new InvitationService();

// GET /api/invitations
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { context } = await requirePermission(session.user.id, "members:create");

    const invitations = await invitationService.getInvitations(context.organizationId);

    return NextResponse.json(invitations, { status: 200 });
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") {
      return NextResponse.json({ message: "Permission denied." }, { status: 403 });
    }
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}

// POST /api/invitations
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { context } = await requirePermission(session.user.id, "members:create");

    const body = await request.json();
    const validatedData = createInvitationSchema.parse(body);

    const invitation = await invitationService.createInvitation({
      organizationId: context.organizationId,
      email: validatedData.email,
      roleId: validatedData.roleId,
      committeeId: validatedData.committeeId,
      expiresInDays: validatedData.expiresInDays,
    });

    return NextResponse.json(
      { message: "Invitation created successfully.", data: invitation },
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
    if (error instanceof DuplicatePendingInvitationError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    if (error instanceof RoleNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
