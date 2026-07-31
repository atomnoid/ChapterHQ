import crypto from "crypto";
import { InvitationRepository } from "@/repositories/invitation.repository";
import { RoleRepository } from "@/repositories/role.repository";

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
    private readonly roleRepository = new RoleRepository()
  ) {}

  private generateToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  async createInvitation(params: {
    organizationId: string;
    email: string;
    roleId?: string;
    expiresInDays: number;
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

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + params.expiresInDays);

    return this.invitationRepository.create({
      organizationId: params.organizationId,
      email: params.email,
      roleId: params.roleId,
      token: this.generateToken(),
      expiresAt,
    });
  }

  async getInvitations(organizationId: string) {
    return this.invitationRepository.listByOrganization(organizationId);
  }

  async cancelInvitation(id: string, organizationId: string) {
    const invitation = await this.invitationRepository.findByIdAndOrg(id, organizationId);
    if (!invitation) {
      throw new InvitationNotFoundError();
    }
    return this.invitationRepository.softDelete(id, organizationId);
  }
}
