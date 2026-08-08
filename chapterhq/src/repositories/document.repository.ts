import { prisma } from "@/lib/prisma";
import { Document, Prisma } from "@prisma/client";

export interface CreateDocumentInput {
  organizationId: string;
  title: string;
  description?: string;
  fileUrl: string;
  category?: string;
  uploadedBy?: string;
  committeeId?: string | null;
}

export interface ListDocumentsQuery {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
  committeeId?: string | null;
}

export class DocumentRepository {
  async create(data: CreateDocumentInput): Promise<Document> {
    return prisma.document.create({
      data: {
        organizationId: data.organizationId,
        title: data.title,
        description: data.description,
        fileUrl: data.fileUrl,
        category: data.category,
        uploadedBy: data.uploadedBy,
        committeeId: data.committeeId,
      },
    });
  }

  async findById(id: string, organizationId: string): Promise<Document | null> {
    // MongoDB Prisma bug: deletedAt: null in where clause returns no results.
    const doc = await prisma.document.findFirst({
      where: { id, organizationId },
    });
    if (doc?.deletedAt) return null;
    return doc;
  }

  async list(organizationId: string, query: ListDocumentsQuery = {}) {
    const { search, category, page = 1, limit = 10, committeeId } = query;
    const skip = (page - 1) * limit;

    // MongoDB Prisma bug: deletedAt: null removed from where; JS post-filter applied below.
    const where: Prisma.DocumentWhereInput = {
      organizationId,
      ...(category ? { category } : {}),
      ...(committeeId ? { committeeId } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const allItems = await prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const notDeleted = allItems.filter((d) => !d.deletedAt);
    const total = notDeleted.length;
    const items = notDeleted.slice(skip, skip + limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async softDelete(id: string, organizationId: string): Promise<Document> {
    return prisma.document.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
