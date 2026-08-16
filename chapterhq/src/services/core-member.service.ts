import { CoreMemberRepository } from "@/repositories/core-member.repository";
import { MemberRepository } from "@/repositories/member.repository";
import { logActivity } from "@/lib/audit-logger";

export class CoreMemberAlreadyExistsError extends Error {
  constructor() {
    super("This member is already designated as a Core Member.");
    this.name = "CoreMemberAlreadyExistsError";
  }
}

export class CoreMemberNotFoundError extends Error {
  constructor() {
    super("Core Member record not found.");
    this.name = "CoreMemberNotFoundError";
  }
}

export class CoreMemberService {
  constructor(
    private readonly repository = new CoreMemberRepository(),
    private readonly memberRepo = new MemberRepository()
  ) {}

  async list(organizationId: string, activeCommitteeId?: string | null) {
    return this.repository.list(organizationId, activeCommitteeId);
  }

  async add(
    organizationId: string,
    memberId: string,
    note: string | undefined,
    actorUserId: string
  ) {
    // 1. Ensure member belongs to this org
    const member = await this.memberRepo.findByIdAndOrganization(memberId, organizationId);
    if (!member) {
      throw new Error("Member not found in this organization.");
    }

    // 2. Prevent duplicates
    const existing = await this.repository.findByMember(organizationId, memberId);
    if (existing) {
      throw new CoreMemberAlreadyExistsError();
    }

    const record = await this.repository.create({ organizationId, memberId, note });

    const memberName = member.user?.name || member.user?.email || memberId;

    await logActivity(
      { userId: actorUserId, organizationId },
      "create",
      "core_member",
      record.id,
      `Member ${memberName} designated as Core Member`
    );

    return record;
  }

  async remove(id: string, organizationId: string, actorUserId: string) {
    const record = await this.repository.findById(id, organizationId);
    if (!record) {
      throw new CoreMemberNotFoundError();
    }

    const deleted = await this.repository.softDelete(id, organizationId);

    await logActivity(
      { userId: actorUserId, organizationId },
      "delete",
      "core_member",
      id,
      `Core Member record removed`
    );

    return deleted;
  }
}
