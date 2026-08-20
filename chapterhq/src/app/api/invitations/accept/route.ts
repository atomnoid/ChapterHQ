import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
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

    console.log("[INVITE_ACCEPT_DEBUG] authenticatedUserId", session.user.id);
    console.log("[INVITE_ACCEPT_DEBUG] authenticatedUserEmail", session.user.email ?? null);
    console.log("[INVITE_ACCEPT_DEBUG] tokenPresent", Boolean(token));

    if (!token) {
      return NextResponse.json({ message: "Token is required." }, { status: 400 });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        organization: true,
      },
    });

    console.log("[INVITE_ACCEPT_DEBUG] invitationFound", Boolean(invitation));
    console.log("[INVITE_ACCEPT_DEBUG] invitationStatus", invitation?.status ?? null);
    console.log("[INVITE_ACCEPT_DEBUG] invitationEmail", invitation?.email ?? null);
    console.log("[INVITE_ACCEPT_DEBUG] invitationExpiresAt", invitation?.expiresAt ?? null);
    console.log("[INVITE_ACCEPT_DEBUG] invitationAcceptedAt", invitation?.updatedAt ?? null);
    console.log("[INVITE_ACCEPT_DEBUG] organizationId", invitation?.organizationId ?? null);
    console.log("[INVITE_ACCEPT_DEBUG] invitationRoleId", invitation?.roleId ?? null);

    if (!invitation || invitation.deletedAt) {
      return NextResponse.json({ message: "Invitation not found." }, { status: 404 });
    }

    console.log("[INVITE_ACCEPT_DEBUG] invitationDeletedAt", invitation.deletedAt ?? null);
    console.log("[INVITE_ACCEPT_DEBUG] invitationCommitteeId", invitation.committeeId ?? null);
    console.log("[INVITE_ACCEPT_DEBUG] invitationOrganizationExists", Boolean(invitation.organization));

    const isExpired = new Date() > new Date(invitation.expiresAt);
    if (isExpired || invitation.status === "EXPIRED") {
      return NextResponse.json({ message: "Invitation has expired." }, { status: 410 });
    }

    if (invitation.status === "ACCEPTED") {
      return NextResponse.json({ message: "Invitation already accepted.", alreadyAccepted: true }, { status: 200 });
    }

    if (invitation.status === "CANCELLED") {
      return NextResponse.json({ message: "Invitation is no longer valid." }, { status: 410 });
    }

    if (invitation.status !== "PENDING") {
      return NextResponse.json({ message: "Invitation is not pending." }, { status: 400 });
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

    const existingMembership = await prisma.member.findFirst({
      where: {
        organizationId: invitation.organizationId,
        userId: session.user.id,
      },
    });

    console.log("[INVITE_ACCEPT_DEBUG] existingMemberId", existingMembership?.id ?? null);
    console.log("[INVITE_ACCEPT_DEBUG] existingMemberStatus", existingMembership?.status ?? null);
    console.log("[INVITE_ACCEPT_DEBUG] existingMemberDeletedAt", existingMembership?.deletedAt ?? null);

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

      console.log("[INVITE_ACCEPT_DEBUG] membershipAction", membershipAction);
      console.log("[INVITE_ACCEPT_DEBUG] resolvedMemberId", member.id);

      const roleIdToAssign = invitation.roleId;
      await tx.userRole.deleteMany({
        where: {
          memberId: member.id,
        },
      });

      if (roleIdToAssign) {
        console.log("[INVITE_ACCEPT_DEBUG] validatingInvitationRole", {
          memberId: member.id,
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

        await tx.userRole.create({
          data: {
            memberId: member.id,
            roleId: roleIdToAssign,
          },
        });
        console.log("[INVITE_ACCEPT_DEBUG] roleAssignmentApplied", {
          memberId: member.id,
          roleId: roleIdToAssign,
        });
      } else {
        console.log("[INVITE_ACCEPT_DEBUG] noRoleAssignedToInvitation", {
          memberId: member.id,
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

      const conflictingAcceptedInvitation = await tx.invitation.findFirst({
        where: {
          organizationId: invitation.organizationId,
          email: invitation.email,
          status: "ACCEPTED",
          id: { not: invitation.id },
        },
      });

      if (conflictingAcceptedInvitation) {
        console.log("[INVITE_ACCEPT_DEBUG] cancellingConflictingAcceptedInvitation", {
          invitationId: conflictingAcceptedInvitation.id,
          email: conflictingAcceptedInvitation.email,
          organizationId: conflictingAcceptedInvitation.organizationId,
        });

        await tx.invitation.update({
          where: { id: conflictingAcceptedInvitation.id },
          data: {
            status: "CANCELLED",
            deletedAt: new Date(),
          },
        });
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

    // Check if there are any required onboarding forms applicable to this member.
    // Global (no committee) forms always apply; committee-specific forms apply if they joined a committee.
    const globalRequiredForm = await prisma.customForm.findFirst({
      where: {
        organizationId: invitation.organizationId,
        required: true,
        status: "ACTIVE",
        committeeId: null,
      },
    });

    let committeeRequiredForm = null;
    if (finalActiveCommitteeId) {
      committeeRequiredForm = await prisma.customForm.findFirst({
        where: {
          organizationId: invitation.organizationId,
          required: true,
          status: "ACTIVE",
          committeeId: finalActiveCommitteeId,
        },
      });
    }

    const requiresOnboarding =
      (!!globalRequiredForm && !globalRequiredForm.deletedAt) ||
      (!!committeeRequiredForm && !committeeRequiredForm.deletedAt);

    return NextResponse.json({
      message: "Invitation accepted successfully.",
      activeOrganizationId: invitation.organizationId,
      activeCommitteeId: finalActiveCommitteeId,
      membershipAction,
      requiresOnboarding,
    });
  } catch (error) {
    console.error("[INVITE_ACCEPT_ERROR] errorName", error instanceof Error ? error.name : typeof error);
    console.error("[INVITE_ACCEPT_ERROR] errorMessage", error instanceof Error ? error.message : String(error));
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("[INVITE_ACCEPT_ERROR] prismaErrorCode", error.code);
      console.error("[INVITE_ACCEPT_ERROR] prismaMeta", error.meta ?? null);
    }
    console.error("[INVITE_ACCEPT_ERROR] stack", error instanceof Error ? error.stack : undefined);

    const isDev = process.env.NODE_ENV !== "production";
    return NextResponse.json({
      message: "Internal server error.",
      ...(isDev && {
        error: error instanceof Error ? error.message : String(error),
      }),
    }, { status: 500 });
  }
}
