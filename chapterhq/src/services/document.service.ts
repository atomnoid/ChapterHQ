import { DocumentRepository, ListDocumentsQuery } from "@/repositories/document.repository";
import { CreateDocumentInput } from "@/validators/document.validator";
import { logActivity } from "@/lib/audit-logger";

export class DocumentNotFoundError extends Error {
  constructor(message = "Document not found.") {
    super(message);
    this.name = "DocumentNotFoundError";
  }
}

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

  async getDocument(id: string, organizationId: string) {
    const document = await this.documentRepo.findById(id, organizationId);
    if (!document) {
      throw new DocumentNotFoundError();
    }
    return document;
  }

  async listDocuments(organizationId: string, query: ListDocumentsQuery = {}) {
    return this.documentRepo.list(organizationId, query);
  }

  async deleteDocument(id: string, organizationId: string, actorId?: string) {
    const document = await this.getDocument(id, organizationId);

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
