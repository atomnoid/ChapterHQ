import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  InvitationAcceptService,
  InvitationNotFoundOrExpiredError,
  AlreadyMemberError,
} from "@/services/invitation-accept.service";

const invitationAcceptService = new InvitationAcceptService();

/**
 * POST /api/invitations/accept
 * Body: { token: string }
 *
 * Accepts a pending invitation for the current authenticated user.
 * Returns { organizationId } on success so the client can redirect.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const token = typeof body?.token === "string" ? body.token.trim() : "";

    if (!token) {
      return NextResponse.json(
        { message: "Invitation token is required." },
        { status: 400 }
      );
    }

    const result = await invitationAcceptService.acceptInvitation(
      token,
      session.user.id
    );

    return NextResponse.json(
      {
        message: "Invitation accepted successfully.",
        organizationId: result.organizationId,
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.name === "InvitationNotFoundOrExpiredError") {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    if (error.name === "AlreadyMemberError") {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
}
