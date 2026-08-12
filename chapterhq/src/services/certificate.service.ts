import { CertificateRepository } from "@/repositories/certificate.repository";
import { MemberRepository } from "@/repositories/member.repository";
import { buildPaginationParams, buildPaginatedResult, PaginationQuery } from "@/lib/pagination";
import { logActivity } from "@/lib/audit-logger";
import { SystemNotificationService } from "@/services/system-notification.service";
import { EmailService } from "@/services/email.service";

export class CertificateNotFoundError extends Error {
  constructor() {
    super("Certificate not found.");
    this.name = "CertificateNotFoundError";
  }
}

export class DuplicateCredentialIdError extends Error {
  constructor() {
    super("A certificate with this Credential ID already exists in this organization.");
    this.name = "DuplicateCredentialIdError";
  }
}

export class MemberNotFoundError extends Error {
  constructor() {
    super("Member not found in this organization.");
    this.name = "MemberNotFoundError";
  }
}

export class CertificateService {
  constructor(
    private readonly repository = new CertificateRepository(),
    private readonly memberRepo = new MemberRepository(),
    private readonly systemNotificationService = new SystemNotificationService(),
    private readonly emailService = new EmailService()
  ) {}

  async createCertificate(
    organizationId: string,
    data: {
      memberId: string;
      title: string;
      description?: string;
      issueDate: Date;
      expiryDate?: Date;
      credentialId?: string;
      certificateUrl?: string;
    },
    actorUserId?: string
  ) {
    // 1. Verify member belongs to the organization
    const member = await this.memberRepo.findByIdAndOrganization(data.memberId, organizationId);
    if (!member) {
      throw new MemberNotFoundError();
    }

    // 2. Prevent duplicate credentialId in the organization if provided
    if (data.credentialId) {
      const exists = await this.repository.existsByCredentialId(organizationId, data.credentialId);
      if (exists) {
        throw new DuplicateCredentialIdError();
      }
    }

    const certificate = await this.repository.create({
      organizationId,
      ...data,
    });

    try {
      await this.systemNotificationService.notifyMember({
        organizationId,
        memberId: certificate.memberId,
        sourceType: "CERTIFICATE",
        sourceId: certificate.id,
        eventType: "CERTIFICATE_ISSUED",
        title: "Certificate Issued",
        message: certificate.certificateUrl
          ? `Your certificate has been issued and is now available: ${certificate.certificateUrl}`
          : "Your certificate has been issued and is now available.",
      });
    } catch (error) {
      console.error("[SystemNotification] certificate delivery failed", error);
    }

    try {
      const result = await this.emailService.sendCertificateEmail(organizationId, certificate.id);
      if (!result.success) console.error("[EmailService] certificate email failed", result.error);
    } catch (error) {
      console.error("[EmailService] certificate email failed", error instanceof Error ? error.message : error);
    }

    if (actorUserId) {
      await logActivity(
        { userId: actorUserId, organizationId },
        "create",
        "certificate",
        certificate.id,
        certificate.title
      );
    }

    return certificate;
  }

  async getCertificates(organizationId: string, params: PaginationQuery, activeCommitteeId?: string | null) {
    const paginationParams = buildPaginationParams(params);
    const { total, items } = await this.repository.list({
      ...paginationParams,
      organizationId,
      activeCommitteeId,
    });

    return buildPaginatedResult(items, total, params);
  }

  async getCertificate(id: string, organizationId: string) {
    const certificate = await this.repository.findById(id, organizationId);
    if (!certificate) {
      throw new CertificateNotFoundError();
    }
    return certificate;
  }

  async updateCertificate(
    id: string,
    organizationId: string,
    data: {
      memberId?: string;
      title?: string;
      description?: string;
      issueDate?: Date;
      expiryDate?: Date;
      credentialId?: string;
      certificateUrl?: string;
    },
    actorUserId?: string
  ) {
    const certificate = await this.repository.findById(id, organizationId);
    if (!certificate) {
      throw new CertificateNotFoundError();
    }

    // If memberId is changing, verify it belongs to organization
    if (data.memberId && data.memberId !== certificate.memberId) {
      const member = await this.memberRepo.findByIdAndOrganization(data.memberId, organizationId);
      if (!member) {
        throw new MemberNotFoundError();
      }
    }

    // Prevent duplicate credentialId in the organization
    if (data.credentialId && data.credentialId !== certificate.credentialId) {
      const exists = await this.repository.existsByCredentialId(organizationId, data.credentialId, id);
      if (exists) {
        throw new DuplicateCredentialIdError();
      }
    }

    const updated = await this.repository.update(id, organizationId, data);

    if (actorUserId) {
      await logActivity(
        { userId: actorUserId, organizationId },
        "update",
        "certificate",
        id,
        updated.title,
        data
      );
    }

    return updated;
  }

  async deleteCertificate(id: string, organizationId: string, actorUserId?: string) {
    const certificate = await this.repository.findById(id, organizationId);
    if (!certificate) {
      throw new CertificateNotFoundError();
    }

    const deleted = await this.repository.softDelete(id, organizationId);

    if (actorUserId) {
      await logActivity(
        { userId: actorUserId, organizationId },
        "delete",
        "certificate",
        id,
        certificate.title
      );
    }

    return deleted;
  }
}
