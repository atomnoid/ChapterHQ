import { MemberRepository } from "@/repositories/member.repository";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export class OrganizationContextNotFoundError extends Error {
  constructor() {
    super("User does not belong to any active organization.");
    this.name = "OrganizationContextNotFoundError";
  }
}

export interface OrganizationContext {
  organizationId: string;
  organization: NonNullable<
    Awaited<ReturnType<MemberRepository["findActiveByUserId"]>>
  >["organization"];
  member: NonNullable<
    Awaited<ReturnType<MemberRepository["findActiveByUserId"]>>
  >;
  activeCommitteeId?: string | null;
}

export class OrganizationContextService {
  constructor(
    private readonly memberRepository = new MemberRepository()
  ) {}

  async resolve(userId: string): Promise<OrganizationContext> {
    const session = await auth();
    const activeOrgId = session?.activeOrganizationId;
    const activeCommitteeId = session?.activeCommitteeId;

    console.log("[OrgContext] resolve userId:", userId, "session.activeOrganizationId:", activeOrgId, "session.activeCommitteeId:", activeCommitteeId);

    let member = await this.memberRepository.findActiveByUserId(userId, activeOrgId);

    // Fallback: If no membership was found with the session's activeOrganizationId
    // or activeOrganizationId was empty, try fetching the first active organization membership.
    if (!member) {
      console.log("[OrgContext] primary lookup returned null — trying fallback (no orgId filter)");
      member = await this.memberRepository.findActiveByUserId(userId);
    }

    console.log("[OrgContext] final member:", member?.id ?? null);

    if (!member) {
      throw new OrganizationContextNotFoundError();
    }

    let validatedCommitteeId: string | null = null;
    if (activeCommitteeId) {
      const committee = await prisma.committee.findFirst({
        where: {
          id: activeCommitteeId,
          organizationId: member.organizationId,
        },
      });
      if (committee && !committee.deletedAt) {
        // Verify user has access to that committee
        const committeeMember = await prisma.committeeMember.findFirst({
          where: {
            committeeId: activeCommitteeId,
            memberId: member.id,
          },
        });
        let hasAccess = !!(committeeMember && !committeeMember.deletedAt);
        if (!hasAccess) {
          const userRoles = await prisma.userRole.findMany({
            where: {
              memberId: member.id,
            },
            include: {
              role: true,
            },
          });
          const activeUserRoles = userRoles.filter((ur) => !ur.role.deletedAt);
          const isPresident = activeUserRoles.some((ur) => ur.role.name === "President");
          if (isPresident) {
            hasAccess = true;
          }
        }
        if (hasAccess) {
          validatedCommitteeId = activeCommitteeId;
        }
      }
    }

    return {
      organizationId: member.organizationId,
      organization: member.organization,
      member,
      activeCommitteeId: validatedCommitteeId,
    };
  }
}
