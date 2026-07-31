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
    const activeOrgId = session?.activeOrganizationId;

    const member = await this.memberRepository.findActiveByUserId(userId, activeOrgId);

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
