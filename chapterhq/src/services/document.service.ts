import { DocumentRepository, ListDocumentsQuery } from "@/repositories/document.repository";
import { CreateDocumentInput as ZodCreateInput } from "@/validators/document.validator";
import { logActivity } from "@/lib/audit-logger";
import { PermissionDeniedError } from "@/types/errors";
import { prisma } from "@/lib/prisma";

export class DocumentNotFoundError extends Error {
  constructor(message = "Document not found.") {
    super(message);
    this.name = "DocumentNotFoundError";
  }
}

type CreateDocumentInput = ZodCreateInput & { committeeId?: string | null };

export class DocumentService {
  private documentRepo: DocumentRepository;

  constructor() {
    this.documentRepo = new DocumentRepository();
  }

  async createDocument(
    organizationId: string,
    input: CreateDocumentInput,
    actorId?: string
  ) {
    if (input.committeeId) {
      // 1. Verify committee belongs to organization and is not deleted
      const committee = await prisma.committee.findFirst({
        where: { id: input.committeeId, organizationId },
      });
      if (!committee || committee.deletedAt) {
        throw new PermissionDeniedError();
      }

      // 2. Check if user has access to that committee using existing rules
      if (actorId) {
        const member = await prisma.member.findFirst({
          where: { userId: actorId, organizationId, status: "ACTIVE" },
        });
        if (!member || member.deletedAt) {
          throw new PermissionDeniedError();
        }

        const userRoles = await prisma.userRole.findMany({
          where: { memberId: member.id },
          include: { role: true },
        });
        const isPresident = userRoles.some(ur => ur.role.name === "President" && !ur.role.deletedAt);

        if (!isPresident) {
          // Check CommitteeMember row
          const committeeMembers = await prisma.committeeMember.findMany({
            where: { committeeId: input.committeeId, memberId: member.id },
          });
          const isCM = committeeMembers.some(cm => !cm.deletedAt);

          // Also check Committee Head appointment (covers heads not explicitly added as members)
          const appointments = await prisma.appointment.findMany({
            where: {
              committeeId: input.committeeId,
              memberId: member.id,
              status: "ACTIVE",
            },
          });
          const isHead = !isCM && appointments.some(a => !a.deletedAt && ["Committee Head", "Head", "Chairman", "Chair", "Committee Lead", "Lead"].includes(a.designation));

          if (!isCM && !isHead) {
            throw new PermissionDeniedError();
          }
        }
      }
    }

    const document = await this.documentRepo.create({
      organizationId,
      ...input,
      uploadedBy: actorId,
    });

    if (actorId) {
      await logActivity({
        organizationId,
        actorId,
        action: "create",
        resource: "document",
        targetId: document.id,
        targetName: document.title,
      });
    }

    return document;
  }

  async getDocument(id: string, organizationId: string, activeCommitteeId?: string | null) {
    const document = await this.documentRepo.findById(id, organizationId);
    if (!document) {
      throw new DocumentNotFoundError();
    }

    if (activeCommitteeId && document.committeeId !== activeCommitteeId) {
      throw new DocumentNotFoundError();
    }

    return document;
  }

  async listDocuments(organizationId: string, query: ListDocumentsQuery = {}) {
    return this.documentRepo.list(organizationId, query);
  }

  async deleteDocument(id: string, organizationId: string, actorId?: string, activeCommitteeId?: string | null) {
    const document = await this.getDocument(id, organizationId, activeCommitteeId);

    const deleted = await this.documentRepo.softDelete(id, organizationId);

    if (actorId) {
      await logActivity({
        organizationId,
        actorId,
        action: "delete",
        resource: "document",
        targetId: document.id,
        targetName: document.title,
      });
    }

    return deleted;
  }
}
