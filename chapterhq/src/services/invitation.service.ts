import crypto from "crypto";
import { InvitationRepository } from "@/repositories/invitation.repository";
import { RoleRepository } from "@/repositories/role.repository";
import { CommitteeRepository } from "@/repositories/committee.repository";
import { logActivity } from "@/lib/audit-logger";
import { isCommitteeHead, isPresident } from "@/lib/committee-auth";
import { PermissionDeniedError } from "@/types/errors";
import { RoleNotFoundError } from "@/services/role.service";
import { EmailService } from "@/services/email.service";
import { prisma } from "@/lib/prisma";
import type { EmailPrismaClient } from "@/types/email";

const emailPrisma = prisma as unknown as EmailPrismaClient;

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

export class InvitationEmailDeliveryError extends Error {
  constructor(message: string) {
    super(`Email could not be sent: ${message}`);
    this.name = "InvitationEmailDeliveryError";
  }
}

export class EmailTemplateNotFoundError extends Error {
  constructor() {
    super("Please create or select an email template before sending.");
    this.name = "EmailTemplateNotFoundError";
  }
}

export class InvitationService {
  constructor(
    private readonly invitationRepository = new InvitationRepository(),
    private readonly roleRepository = new RoleRepository(),
    private readonly committeeRepository = new CommitteeRepository(),
    private readonly emailService = new EmailService()
  ) {}

  private generateToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  async createInvitation(params: {
    organizationId: string;
    email: string;
    roleId?: string;
    committeeId?: string;
    emailTemplateId?: string;
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
        const isPres = await isPresident(params.actorId, params.organizationId);
        const isHead = await isCommitteeHead(params.actorId, params.organizationId, finalCommitteeId);
        if (!isPres && !isHead) {
          throw new PermissionDeniedError();
        }
      }
    }

    let emailTemplateId: string | undefined = params.emailTemplateId;
    if (emailTemplateId) {
      const template = await emailPrisma.emailTemplate.findFirst({
        where: { id: emailTemplateId, organizationId: params.organizationId },
      });
      if (!template || template.deletedAt || template.archivedAt || template.type !== "ORGANIZATION_INVITATION") {
        throw new EmailTemplateNotFoundError();
      }
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + params.expiresInDays);

    const invitation = await this.invitationRepository.create({
      organizationId: params.organizationId,
      email: params.email,
      roleId: params.roleId,
      committeeId: finalCommitteeId,
      emailTemplateId,
      token: this.generateToken(),
      expiresAt,
    });

    try {
      const [organization, role, committee] = await Promise.all([
        prisma.organization.findFirst({ where: { id: params.organizationId } }),
        params.roleId ? prisma.role.findFirst({ where: { id: params.roleId, organizationId: params.organizationId } }) : null,
        finalCommitteeId ? prisma.committee.findFirst({ where: { id: finalCommitteeId, organizationId: params.organizationId } }) : null,
      ]);

      const emailResult = await this.emailService.sendInvitationEmail({
        organizationId: params.organizationId,
        invitationId: invitation.id,
        email: invitation.email,
        token: invitation.token,
        templateId: emailTemplateId,
        variables: {
          organizationName: organization?.name,
          organizationSlug: organization?.slug,
          roleName: role?.name,
          committeeName: committee?.name,
        },
      });

      if (!emailResult.success) {
        throw new InvitationEmailDeliveryError(emailResult.error ?? "Unknown email provider error.");
      }
    } catch (error) {
      console.error("[EmailService] invitation email failed", error instanceof Error ? error.message : error);
      if (error instanceof InvitationEmailDeliveryError) throw error;
      if (error instanceof EmailTemplateNotFoundError) throw error;
      throw new InvitationEmailDeliveryError(error instanceof Error ? error.message : "Unknown email provider error.");
    }

    await logActivity(
      { userId: params.actorId, organizationId: params.organizationId },
      "create",
      "invitation",
      invitation.id,
      params.email,
      {
        roleId: params.roleId ?? null,
        committeeId: finalCommitteeId ?? null,
        emailTemplateId: emailTemplateId ?? null,
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
