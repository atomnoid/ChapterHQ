import crypto from "crypto";
import { InvitationRepository } from "@/repositories/invitation.repository";
import { RoleRepository } from "@/repositories/role.repository";
import { CommitteeRepository } from "@/repositories/committee.repository";
import { logActivity } from "@/lib/audit-logger";

export class DuplicatePendingInvitationError extends Error {
  constructor() {
    super("A pending invitation for this email already exists.");
    this.name = "DuplicatePendingInvitationError";
  }
}

export class InvitationNotFoundError extends Error {
  constructor() {
    super("Invitation not found.");
    this.name = "InvitationNotFoundError";
  }
}

export class InvitationService {
  constructor(
    private readonly invitationRepository = new InvitationRepository(),
    private readonly roleRepository = new RoleRepository(),
    private readonly committeeRepository = new CommitteeRepository()
  ) {}

  private generateToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  async createInvitation(params: {
    organizationId: string;
    email: string;
    roleId?: string;
    committeeId?: string;
    expiresInDays: number;
    actorId: string;
  }) {
    // Duplicate pending check
    const existing = await this.invitationRepository.findPendingByEmailAndOrg(
      params.email,
      params.organizationId
    );
    if (existing) {
      throw new DuplicatePendingInvitationError();
    }

    // Validate roleId belongs to the same org
    if (params.roleId) {
      const role = await this.roleRepository.findById(params.roleId, params.organizationId);
      if (!role) {
        const { RoleNotFoundError } = require("@/services/role.service");
        throw new RoleNotFoundError(params.roleId);
      }
    }

    // Validate committeeId belongs to the same org
    let finalCommitteeId: string | undefined = params.committeeId;
    if (finalCommitteeId) {
      const committee = await this.committeeRepository.findById(finalCommitteeId, params.organizationId);
      if (!committee) {
        // Ignore any invalid/cross-organization committeeId
        finalCommitteeId = undefined;
      } else {
        // Verify actor can manage that committee
        const { isPresident, isCommitteeHead } = require("@/lib/committee-auth");
        const isPres = await isPresident(params.actorId, params.organizationId);
        const isHead = await isCommitteeHead(params.actorId, params.organizationId, finalCommitteeId);
        if (!isPres && !isHead) {
          const { PermissionDeniedError } = require("@/types/errors");
          throw new PermissionDeniedError();
        }
      }
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + params.expiresInDays);

    const invitation = await this.invitationRepository.create({
      organizationId: params.organizationId,
      email: params.email,
      roleId: params.roleId,
      committeeId: finalCommitteeId,
      token: this.generateToken(),
      expiresAt,
    });

    await logActivity(
      { userId: params.actorId, organizationId: params.organizationId },
      "create",
      "invitation",
      invitation.id,
      params.email,
      {
        roleId: params.roleId ?? null,
        committeeId: finalCommitteeId ?? null,
        expiresAt: expiresAt.toISOString(),
      }
    );

    return invitation;
  }

  async getInvitations(organizationId: string) {
    return this.invitationRepository.listByOrganization(organizationId);
  }

  async cancelInvitation(id: string, organizationId: string, actorId?: string) {
    const invitation = await this.invitationRepository.findByIdAndOrg(id, organizationId);
    if (!invitation) {
      throw new InvitationNotFoundError();
    }
    const result = await this.invitationRepository.softDelete(id, organizationId);

    if (actorId) {
      await logActivity(
        { userId: actorId, organizationId },
        "cancel",
        "invitation",
        id,
        invitation.email
      );
    }

    return result;
  }
}
