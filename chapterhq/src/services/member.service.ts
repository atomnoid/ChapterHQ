import { MemberRepository } from "@/repositories/member.repository";

export class MemberAlreadyExistsError extends Error {
  constructor() {
    super("User is already a member of this organization.");
    this.name = "MemberAlreadyExistsError";
  }
}

export class MemberService {
  constructor(
    private readonly repository = new MemberRepository()
  ) {}

  async createMember(organizationId: string, userId: string) {
    const existing = await this.repository.findByOrganizationAndUser(
      organizationId,
      userId
    );

    if (existing) {
      throw new MemberAlreadyExistsError();
    }

    return this.repository.create({ organizationId, userId });
  }
}
