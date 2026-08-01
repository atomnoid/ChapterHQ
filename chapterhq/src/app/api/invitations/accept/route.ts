import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit-logger";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        organization: true,
      },
    });

    if (!invitation || invitation.deletedAt) {
      return NextResponse.json({ message: "Invitation not found." }, { status: 404 });
    }

    // Fetch assigned role details if present
    let role = null;
    if (invitation.roleId) {
      role = await prisma.role.findUnique({
        where: { id: invitation.roleId },
      });
    }

    return NextResponse.json({
      invitation,
      role,
    });
  } catch (error) {
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { token } = await params;

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        organization: true,
      },
    });

    if (!invitation || invitation.deletedAt) {
      return NextResponse.json({ message: "Invitation not found." }, { status: 404 });
    }

    const isExpired = new Date() > new Date(invitation.expiresAt);
    if (isExpired || invitation.status === "EXPIRED") {
      return NextResponse.json({ message: "Invitation has expired." }, { status: 410 });
    }

    if (invitation.status === "ACCEPTED") {
      return NextResponse.json({ message: "Invitation already accepted.", alreadyAccepted: true }, { status: 200 });
    }

    const loggedInEmail = session.user.email?.toLowerCase();
    const invitedEmail = invitation.email.toLowerCase();

    if (loggedInEmail !== invitedEmail) {
      return NextResponse.json(
        { message: `Access denied. This invitation is for ${invitation.email}, but you are signed in as ${session.user.email}.` },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body as { action: "accept" | "reject" };

    if (action === "reject") {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "CANCELLED" },
      });

      await logActivity(
        { userId: session.user.id, organizationId: invitation.organizationId },
        "reject",
        "invitation",
        invitation.id,
        `Invitation for ${invitation.email}`
      );

      return NextResponse.json({ message: "Invitation rejected successfully." });
    }

    // Check if user is already a member
    let member = await prisma.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId: session.user.id,
        },
      },
    });

    if (!member) {
      member = await prisma.member.create({
        data: {
          organizationId: invitation.organizationId,
          userId: session.user.id,
          status: "ACTIVE",
        },
      });
    }

    // Resolve or assign role
    let roleIdToAssign = invitation.roleId;
    if (!roleIdToAssign) {
      const defaultRole = await prisma.role.findFirst({
        where: {
          organizationId: invitation.organizationId,
          name: "Volunteer",
        },
      });
      if (defaultRole) {
        roleIdToAssign = defaultRole.id;
      }
    }

    if (roleIdToAssign) {
      const existingUserRole = await prisma.userRole.findUnique({
        where: {
          memberId_roleId: {
            memberId: member.id,
            roleId: roleIdToAssign,
          },
        },
      });
      if (!existingUserRole) {
        await prisma.userRole.create({
          data: {
            memberId: member.id,
            roleId: roleIdToAssign,
          },
        });
      }
    }

    // Mark invitation accepted
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED" },
    });

    // Create Audit Log
    await logActivity(
      { userId: session.user.id, organizationId: invitation.organizationId },
      "accept",
      "invitation",
      invitation.id,
      `Invitation accepted by ${session.user.email}`
    );

    // Create Notification
    await prisma.notification.create({
      data: {
        organizationId: invitation.organizationId,
        title: "New Member Joined",
        message: `${session.user.name || session.user.email} has accepted the invitation and joined the organization.`,
        type: "MEMBER_JOINED",
        targetScope: "ORGANIZATION",
      },
    });

    return NextResponse.json({ message: "Invitation accepted successfully." });
  } catch (error) {
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
