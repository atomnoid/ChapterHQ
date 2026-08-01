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
    const invitation = await prisma.invitation.findFirst({
      where: {
        token,
        status: "PENDING",
        deletedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!invitation) {
      throw new InvitationNotFoundOrExpiredError();
    }

    const { organizationId, roleId, id: invitationId } = invitation;

    // 2. Check existing membership
    const existing = await this.memberRepository.findByOrganizationAndUser(
      organizationId,
      userId
    );
    if (existing) {
      throw new AlreadyMemberError();
    }

    // 3–5. Create member, assign role, mark invitation accepted — atomically
    const member = await prisma.$transaction(async (tx) => {
      const newMember = await tx.member.create({
        data: { organizationId, userId },
      });

      if (roleId) {
        await tx.userRole.create({
          data: { memberId: newMember.id, roleId },
        });
      }

      await tx.invitation.update({
        where: { id: invitationId },
        data: { status: "ACCEPTED" },
      });

      return newMember;
    });

    return { member, organizationId };
  }
}
