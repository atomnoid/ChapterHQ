import { prisma } from "@/lib/prisma";
import { Document, Prisma } from "@prisma/client";

export interface CreateDocumentInput {
  organizationId: string;
  title: string;
  description?: string;
  fileUrl: string;
  category?: string;
  uploadedBy?: string;
}

export interface ListDocumentsQuery {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
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
      },
    });
  }

  async findById(id: string, organizationId: string): Promise<Document | null> {
    return prisma.document.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
    });
  }

  async list(organizationId: string, query: ListDocumentsQuery = {}) {
    const { search, category, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.DocumentWhereInput = {
      organizationId,
      deletedAt: null,
      ...(category ? { category } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.document.count({ where }),
    ]);

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
