import { MemberRepository } from "@/repositories/member.repository";
import { OrganizationContextNotFoundError } from "@/services/session/organization-context.service";

export class OrganizationContextServiceEx extends OrganizationContextService {
  // Extending context to allow listing and verification
}

export class MultiOrganizationService {
  constructor(
    private readonly memberRepository = new MemberRepository()
  ) {}

  async listUserOrganizations(userId: string) {
    const memberships = await this.memberRepository.listByUser(userId);
    return memberships.map((m) => m.organization);
  }

  async validateMembership(userId: string, organizationId: string) {
    const member = await this.memberRepository.findActiveByUserId(userId, organizationId);
    if (!member || member.organizationId !== organizationId) {
      throw new OrganizationContextNotFoundError();
    }
    return member;
  }
}
