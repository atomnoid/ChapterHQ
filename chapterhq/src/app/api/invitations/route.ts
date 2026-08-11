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
      const { apiResponse } = await import("@/lib/api-response");
      return apiResponse.unauthorized();
    }

    const { context } = await requirePermission(session.user.id, "members:create");

    const invitations = await invitationService.getInvitations(context.organizationId);

    const { apiResponse } = await import("@/lib/api-response");
    return apiResponse.success(invitations);
  } catch (error: any) {
    const { apiResponse } = await import("@/lib/api-response");
    if (error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    return apiResponse.serverError();
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
      actorId: session.user.id,
    });

    const { apiResponse } = await import("@/lib/api-response");
    return apiResponse.created(invitation, "Invitation created successfully.");
  } catch (error: any) {
    const { apiResponse } = await import("@/lib/api-response");
    if (error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    if (error instanceof DuplicatePendingInvitationError) {
      return apiResponse.badRequest(error.message); // map conflict to badRequest
    }
    if (error instanceof RoleNotFoundError) {
      return apiResponse.notFound(error.message);
    }
    return apiResponse.serverError();
  }
}
