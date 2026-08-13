import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit-logger";

export async function GET(
  request: Request
) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ message: "Token is required." }, { status: 400 });
    }

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
      const assignedRole = await prisma.role.findFirst({
        where: {
          id: invitation.roleId,
          organizationId: invitation.organizationId,
          status: "ACTIVE",
        },
      });
      role = assignedRole && !assignedRole.deletedAt ? assignedRole : null;
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
  request: Request
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    console.log("[INVITE ACCEPT] token received", {
      hasToken: Boolean(token),
      userId: session.user.id,
      loggedInEmail: session.user.email ?? null,
    });

    if (!token) {
      return NextResponse.json({ message: "Token is required." }, { status: 400 });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        organization: true,
      },
    });

    console.log("[INVITE ACCEPT] invitation found", {
      found: Boolean(invitation),
      invitationId: invitation?.id ?? null,
      status: invitation?.status ?? null,
      email: invitation?.email ?? null,
      deletedAt: invitation?.deletedAt ?? null,
    });

    if (!invitation || invitation.deletedAt) {
      return NextResponse.json({ message: "Invitation not found." }, { status: 404 });
    }

    console.log("[INVITE ACCEPT] invitation status", { status: invitation.status });
    console.log("[INVITE ACCEPT] invitation expiry", {
      expiresAt: invitation.expiresAt.toISOString(),
      expired: new Date() > new Date(invitation.expiresAt),
    });
    console.log("[INVITE ACCEPT] user id", { userId: session.user.id });
    console.log("[INVITE ACCEPT] organization id", { organizationId: invitation.organizationId });
    console.log("[INVITE ACCEPT] committee id", { committeeId: invitation.committeeId ?? null });

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

    console.log("[invitation/accept] reading request body");
    const body = await request.json();
    const { action } = body as { action: "accept" | "reject" };
    console.log("[invitation/accept] requested action", { action });

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

    console.log("[invitation/accept] existing member lookup", {
      organizationId: invitation.organizationId,
      userId: session.user.id,
    });
    const existingMembership = await prisma.member.findFirst({
      where: {
        organizationId: invitation.organizationId,
        userId: session.user.id,
      },
    });

    console.log("[invitation/accept] existing member status", {
      exists: Boolean(existingMembership),
      status: existingMembership?.status ?? null,
      deletedAt: existingMembership?.deletedAt ?? null,
    });

    const existingActiveMembership = existingMembership && !existingMembership.deletedAt && existingMembership.status === "ACTIVE" ? existingMembership : null;
    const existingDeletedMembership = existingMembership && existingMembership.deletedAt ? existingMembership : null;

    console.log("[INVITE ACCEPT] existing active membership", {
      exists: Boolean(existingActiveMembership),
      memberId: existingActiveMembership?.id ?? null,
    });
    console.log("[INVITE ACCEPT] existing deleted membership", {
      exists: Boolean(existingDeletedMembership),
      memberId: existingDeletedMembership?.id ?? null,
    });

    let finalActiveCommitteeId: string | null = null;
    let membershipAction = "CREATE";
    let member = existingActiveMembership;

    console.log("[invitation/accept] invitation role ID", { roleId: invitation.roleId ?? null });
    console.log("[invitation/accept] starting acceptance transaction");

    const result = await prisma.$transaction(async (tx) => {
      let targetMember = await tx.member.findFirst({
        where: {
          organizationId: invitation.organizationId,
          userId: session.user.id,
        },
      });

      if (targetMember && !targetMember.deletedAt && targetMember.status === "ACTIVE") {
        membershipAction = "EXISTING";
        member = targetMember;
      } else if (targetMember && (targetMember.deletedAt || targetMember.status !== "ACTIVE")) {
        membershipAction = "RESTORE";
        targetMember = await tx.member.update({
          where: { id: targetMember.id },
          data: { deletedAt: null, status: "ACTIVE" },
        });
        member = targetMember;
      } else {
        membershipAction = "CREATE";
        targetMember = await tx.member.create({
          data: {
            organizationId: invitation.organizationId,
            userId: session.user.id,
            status: "ACTIVE",
          },
        });
        member = targetMember;
      }

      console.log("[INVITE ACCEPT] membership action", { action: membershipAction, memberId: member.id });

      const roleIdToAssign = invitation.roleId;
      if (roleIdToAssign) {
        console.log("[invitation/accept] role lookup", {
          roleId: roleIdToAssign,
          organizationId: invitation.organizationId,
        });
        const roleExists = await tx.role.findFirst({
          where: {
            id: roleIdToAssign,
            organizationId: invitation.organizationId,
            status: "ACTIVE",
          },
        });
        if (!roleExists || roleExists.deletedAt) {
          throw new Error("The invited role is no longer available.");
        }

        await tx.userRole.upsert({
          where: {
            memberId_roleId: {
              memberId: member.id,
              roleId: roleIdToAssign,
            },
          },
          update: {},
          create: {
            memberId: member.id,
            roleId: roleIdToAssign,
          },
        });
        console.log("[INVITE ACCEPT] role assignment", {
          memberId: member.id,
          roleId: roleIdToAssign,
        });
      } else {
        console.log("[INVITE ACCEPT] role assignment", {
          memberId: member.id,
          roleId: null,
          reason: "no role assigned to invitation",
        });
      }

      if (invitation.committeeId) {
        const committee = await tx.committee.findFirst({
          where: {
            id: invitation.committeeId,
            organizationId: invitation.organizationId,
          },
        });
        if (committee && !committee.deletedAt) {
          finalActiveCommitteeId = invitation.committeeId;
          await tx.committeeMember.upsert({
            where: {
              committeeId_memberId: {
                committeeId: invitation.committeeId,
                memberId: member.id,
              },
            },
            update: {
              deletedAt: null,
              assignedAt: new Date(),
            },
            create: {
              committeeId: invitation.committeeId,
              memberId: member.id,
            },
          });
        }
      }

      console.log("[invitation/accept] invitation update", { invitationId: invitation.id, newStatus: "ACCEPTED" });
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED" },
      });

      console.log("[INVITE ACCEPT] invitation marked accepted", { invitationId: invitation.id });
      return member;
    });

    console.log("[INVITE ACCEPT] transaction completed", {
      memberId: result.id,
      organizationId: invitation.organizationId,
      committeeId: finalActiveCommitteeId,
    });

    await logActivity(
      { userId: session.user.id, organizationId: invitation.organizationId },
      "accept",
      "invitation",
      invitation.id,
      `Invitation accepted by ${session.user.email}`
    );

    await prisma.notification.create({
      data: {
        organizationId: invitation.organizationId,
        title: "New Member Joined",
        message: `${session.user.name || session.user.email} has accepted the invitation and joined the organization.`,
        type: "MEMBER_JOINED",
        targetScope: "ORGANIZATION",
      },
    });

    return NextResponse.json({
      message: "Invitation accepted successfully.",
      activeOrganizationId: invitation.organizationId,
      activeCommitteeId: finalActiveCommitteeId,
      membershipAction,
    });
  } catch (error) {
    console.error("[invitation/accept] TRANSACTION ERROR:", error);
    console.error("[invitation/accept] ERROR NAME:", error instanceof Error ? error.name : typeof error);
    console.error("[invitation/accept] ERROR MESSAGE:", error instanceof Error ? error.message : error);
    console.error("[invitation/accept] ERROR STACK:", error instanceof Error ? error.stack : undefined);

    const isDev = process.env.NODE_ENV !== "production";
    return NextResponse.json({
      message: "Internal server error.",
      ...(isDev && {
        error: error instanceof Error ? error.message : String(error),
      }),
    }, { status: 500 });
  }
}
