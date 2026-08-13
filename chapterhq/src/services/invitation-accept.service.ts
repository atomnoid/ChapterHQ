import { prisma } from "@/lib/prisma";
import { MemberRepository } from "@/repositories/member.repository";
import { UserRoleRepository } from "@/repositories/user-role.repository";

export class InvitationNotFoundOrExpiredError extends Error {
  constructor() {
    super("Invitation not found, already used, or expired.");
    this.name = "InvitationNotFoundOrExpiredError";
  }
}

export class AlreadyMemberError extends Error {
  constructor() {
    super("You are already a member of this organization.");
    this.name = "AlreadyMemberError";
  }
}

/**
 * Accepts a pending invitation by token.
 *
 * Steps:
 * 1. Find the invitation by token (must be PENDING and not expired).
 * 2. Ensure the user is not already a member.
 * 3. Create the Member record.
 * 4. Assign the invitation's role (if any).
 * 5. Mark the invitation as ACCEPTED.
 *
 * All steps run inside a Prisma transaction to guarantee consistency.
 */
export class InvitationAcceptService {
  constructor(
    private readonly memberRepository = new MemberRepository(),
    private readonly userRoleRepository = new UserRoleRepository()
  ) {}

  async acceptInvitation(token: string, userId: string) {
    // 1. Resolve the invitation
    // MongoDB Prisma bug: deletedAt: null in where clause returns no results.
    const invitation = await prisma.invitation.findFirst({
      where: {
        token,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
    });

    // Treat soft-deleted invitations as not found.
    if (!invitation || invitation.deletedAt) {
      throw new InvitationNotFoundOrExpiredError();
    }

    const { organizationId, roleId, id: invitationId } = invitation;

    // 2. Check for an existing membership, but never treat a soft-deleted row as active.
    const existing = await this.memberRepository.findAnyByOrganizationAndUser(
      organizationId,
      userId
    );

    if (existing && !existing.deletedAt && existing.status === "ACTIVE") {
      return { member: existing, organizationId, activeCommitteeId: invitation.committeeId ?? null, alreadyActive: true };
    }

    // 3–5. Restore the deleted member if needed, otherwise create a new active member.
    let finalActiveCommitteeId: string | null = null;
    const member = await prisma.$transaction(async (tx) => {
      let targetMember = await tx.member.findFirst({
        where: { organizationId, userId },
      });

      if (targetMember && (targetMember.deletedAt || targetMember.status !== "ACTIVE")) {
        targetMember = await tx.member.update({
          where: { id: targetMember.id },
          data: { deletedAt: null, status: "ACTIVE" },
        });
      } else if (!targetMember) {
        targetMember = await tx.member.create({
          data: { organizationId, userId, status: "ACTIVE" },
        });
      }

      await tx.userRole.deleteMany({
        where: { memberId: targetMember.id },
      });

      if (roleId) {
        await tx.userRole.create({
          data: {
            memberId: targetMember.id,
            roleId,
          },
        });
      }

      if (invitation.committeeId) {
        const committee = await tx.committee.findFirst({
          where: {
            id: invitation.committeeId,
            organizationId,
          },
        });
        if (committee && !committee.deletedAt) {
          finalActiveCommitteeId = invitation.committeeId;
          await tx.committeeMember.upsert({
            where: {
              committeeId_memberId: {
                committeeId: invitation.committeeId,
                memberId: targetMember.id,
              },
            },
            update: {
              deletedAt: null,
              assignedAt: new Date(),
            },
            create: {
              committeeId: invitation.committeeId,
              memberId: targetMember.id,
            },
          });
        }
      }

      await tx.invitation.update({
        where: { id: invitationId },
        data: { status: "ACCEPTED" },
      });

      return targetMember;
    });

    return { member, organizationId, activeCommitteeId: finalActiveCommitteeId };
  }
}
