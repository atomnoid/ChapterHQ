import { CommitteeMemberRepository } from "@/repositories/committee-member.repository";
import { CommitteeRepository } from "@/repositories/committee.repository";
import { MemberRepository } from "@/repositories/member.repository";
import { buildPaginationParams, buildPaginatedResult, PaginationQuery } from "@/lib/pagination";
import { logActivity } from "@/lib/audit-logger";

// ─── Domain Errors ────────────────────────────────────────────────────────────

export class MemberAlreadyInCommitteeError extends Error {
  constructor() {
    super("This member is already assigned to the committee.");
    this.name = "MemberAlreadyInCommitteeError";
  }
}

export class MemberNotInCommitteeError extends Error {
  constructor() {
    super("This member is not assigned to the committee.");
    this.name = "MemberNotInCommitteeError";
  }
}

export class CommitteeNotFoundError extends Error {
  constructor() {
    super("Committee not found.");
    this.name = "CommitteeNotFoundError";
  }
}

export class MemberNotFoundError extends Error {
  constructor() {
    super("Member not found in this organization.");
    this.name = "MemberNotFoundError";
  }
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class CommitteeMemberService {
  constructor(
    private readonly committeeMemberRepo = new CommitteeMemberRepository(),
    private readonly committeeRepo = new CommitteeRepository(),
    private readonly memberRepo = new MemberRepository()
  ) {}

  /**
   * Assign multiple existing org members to a committee.
   * Validates both committee and members belong to the organization.
   * Skips members already in the committee to remain idempotent.
   */
  async assignMembersToCommittee(
    committeeId: string,
    memberIds: string[],
    organizationId: string,
    actorUserId?: string
  ) {
    // Validate committee exists and belongs to the org
    const committee = await this.committeeRepo.findById(committeeId, organizationId);
    if (!committee) {
      throw new CommitteeNotFoundError();
    }

    const assignments = [];

    for (const memberId of memberIds) {
      // Validate member exists and belongs to the org
      const member = await this.memberRepo.findByIdAndOrganization(memberId, organizationId);
      if (!member) {
        continue; // Skip invalid members
      }

      // Prevent duplicate active assignment
      const existing = await this.committeeMemberRepo.findAssignment(committeeId, memberId);
      if (existing) {
        continue; // Skip already assigned members
      }

      const assignment = await this.committeeMemberRepo.assign(committeeId, memberId);
      assignments.push(assignment);

      if (actorUserId) {
        await logActivity(
          { userId: actorUserId, organizationId },
          "assign",
          "committee_member",
          memberId,
          member.user?.name ?? `Member ${memberId}`,
          { committeeId, committeeName: committee.name }
        );
      }
    }

    return assignments;
  }

  /**
   * Remove (soft-delete) a member from a committee.
   */
  async removeMemberFromCommittee(
    committeeId: string,
    memberId: string,
    organizationId: string,
    actorUserId?: string
  ) {
    // Validate committee belongs to org
    const committee = await this.committeeRepo.findById(committeeId, organizationId);
    if (!committee) {
      throw new CommitteeNotFoundError();
    }

    // Validate member belongs to org
    const member = await this.memberRepo.findByIdAndOrganization(memberId, organizationId);
    if (!member) {
      throw new MemberNotFoundError();
    }

    // Ensure assignment exists
    const existing = await this.committeeMemberRepo.findAssignment(committeeId, memberId);
    if (!existing) {
      throw new MemberNotInCommitteeError();
    }

    const result = await this.committeeMemberRepo.remove(committeeId, memberId);

    if (actorUserId) {
      await logActivity(
        { userId: actorUserId, organizationId },
        "remove",
        "committee_member",
        memberId,
        member.user?.name ?? `Member ${memberId}`,
        { committeeId, committeeName: committee.name }
      );
    }

    return result;
  }

  /**
   * Paginated list of active members in a committee.
   */
  async listCommitteeMembers(
    committeeId: string,
    organizationId: string,
    params: PaginationQuery
  ) {
    // Validate committee belongs to org
    const committee = await this.committeeRepo.findById(committeeId, organizationId);
    if (!committee) {
      throw new CommitteeNotFoundError();
    }

    const paginationParams = buildPaginationParams(params);
    const { total, items } = await this.committeeMemberRepo.listByCommittee(
      committeeId,
      paginationParams
    );

    return buildPaginatedResult(items, total, params);
  }

  /**
   * List all committees a member belongs to within the organization.
   */
  async listMemberCommittees(memberId: string, organizationId: string) {
    // Validate member belongs to org
    const member = await this.memberRepo.findByIdAndOrganization(memberId, organizationId);
    if (!member) {
      throw new MemberNotFoundError();
    }

    return this.committeeMemberRepo.listByMember(memberId, organizationId);
  }
}
