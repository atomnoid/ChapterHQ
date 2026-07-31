import { MemberRepository } from "@/repositories/member.repository";
import { buildPaginationParams, buildPaginatedResult, PaginationQuery } from "@/lib/pagination";
import { logActivity } from "@/lib/audit-logger";

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

  async createMember(organizationId: string, userId: string, actorUserId?: string) {
    const existing = await this.repository.findByOrganizationAndUser(
      organizationId,
      userId
    );

    if (existing) {
      throw new MemberAlreadyExistsError();
    }

    const member = await this.repository.create({ organizationId, userId });

    if (actorUserId) {
      await logActivity(
        { userId: actorUserId, organizationId },
        "create",
        "member",
        member.id,
        `User ${userId}`
      );
    }

    return member;
  }

  async getMembers(params: PaginationQuery & { organizationId: string; status?: any }) {
    const paginationParams = buildPaginationParams(params);
    const { total, items } = await this.repository.list({
      ...paginationParams,
      organizationId: params.organizationId,
      status: params.status,
    });

    return buildPaginatedResult(items, total, params);
  }

  async getMember(id: string, organizationId: string) {
    const member = await this.repository.findByIdAndOrganization(id, organizationId);
    if (!member) {
      throw new MemberNotFoundError();
    }
    return member;
  }

  async updateMember(id: string, organizationId: string, data: { status?: any }, actorUserId?: string) {
    const member = await this.repository.findByIdAndOrganization(id, organizationId);
    if (!member) {
      throw new MemberNotFoundError();
    }
    const updated = await this.repository.update(id, organizationId, data);

    if (actorUserId) {
      await logActivity(
        { userId: actorUserId, organizationId },
        "update",
        "member",
        id,
        member.user?.name || `Member ${id}`,
        data
      );
    }

    return updated;
  }

  async deleteMember(id: string, organizationId: string, actorUserId?: string) {
    const member = await this.repository.findByIdAndOrganization(id, organizationId);
    if (!member) {
      throw new MemberNotFoundError();
    }
    const deleted = await this.repository.delete(id, organizationId);

    if (actorUserId) {
      await logActivity(
        { userId: actorUserId, organizationId },
        "delete",
        "member",
        id,
        member.user?.name || `Member ${id}`
      );
    }

    return deleted;
  }
}
