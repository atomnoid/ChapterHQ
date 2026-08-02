import { MemberRepository } from "@/repositories/member.repository";
import { auth } from "@/lib/auth";

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
}

export class OrganizationContextService {
  constructor(
    private readonly memberRepository = new MemberRepository()
  ) {}

  async resolve(userId: string): Promise<OrganizationContext> {
    const session = await auth();
    let activeOrgId = session?.activeOrganizationId;

    console.log("[OrgContext] resolve userId:", userId, "session.activeOrganizationId:", activeOrgId);

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

    return {
      organizationId: member.organizationId,
      organization: member.organization,
      member,
    };
  }
}
