import { MemberRepository } from "@/repositories/member.repository";

export class MemberAlreadyExistsError extends Error {
  constructor() {
    super("User is already a member of this organization.");
    this.name = "MemberAlreadyExistsError";
  }
}

export class MemberNotFoundError extends Error {
  constructor() {
    super("Member not found.");
    this.name = "MemberNotFoundError";
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

  async getMembers(params: {
    organizationId: string;
    search?: string;
    status?: any;
    page: number;
    limit: number;
  }) {
    const skip = (params.page - 1) * params.limit;
    const { total, items } = await this.repository.list({
      organizationId: params.organizationId,
      search: params.search,
      status: params.status,
      skip,
      take: params.limit,
    });

    return {
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(total / params.limit),
      items,
    };
  }

  async getMember(id: string, organizationId: string) {
    const member = await this.repository.findByIdAndOrganization(id, organizationId);
    if (!member) {
      throw new MemberNotFoundError();
    }
    return member;
  }

  async updateMember(id: string, organizationId: string, data: { status?: any }) {
    const member = await this.repository.findByIdAndOrganization(id, organizationId);
    if (!member) {
      throw new MemberNotFoundError();
    }
    return this.repository.update(id, organizationId, data);
  }

  async deleteMember(id: string, organizationId: string) {
    const member = await this.repository.findByIdAndOrganization(id, organizationId);
    if (!member) {
      throw new MemberNotFoundError();
    }
    return this.repository.delete(id, organizationId);
  }
}
