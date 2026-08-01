import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { InvitationService, InvitationNotFoundError } from "@/services/invitation.service";

const invitationService = new InvitationService();

// DELETE /api/invitations/[id]
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { context: authContext } = await requirePermission(session.user.id, "members:create");

    const { id } = await context.params;
    await invitationService.cancelInvitation(id, authContext.organizationId);

    return NextResponse.json({ message: "Invitation cancelled successfully." }, { status: 200 });
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") {
      return NextResponse.json({ message: "Permission denied." }, { status: 403 });
    }
    if (error instanceof InvitationNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
