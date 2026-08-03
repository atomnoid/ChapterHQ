import { prisma } from "@/lib/prisma";
import { Page, ContentStatus, Prisma } from "@prisma/client";

export interface CreatePageInput {
  organizationId: string;
  title: string;
  slug: string;
  content: string;
  status?: ContentStatus;
  publishedAt?: Date;
  authorId?: string;
}

export interface UpdatePageInput {
  title?: string;
  slug?: string;
  content?: string;
  status?: ContentStatus;
  publishedAt?: Date;
}

export interface ListPagesQuery {
  search?: string;
  status?: ContentStatus;
  page?: number;
  limit?: number;
}

export class CMSPageRepository {
  async create(data: CreatePageInput): Promise<Page> {
    return prisma.page.create({
      data: {
        organizationId: data.organizationId,
        title: data.title,
        slug: data.slug,
        content: data.content,
        status: data.status ?? ContentStatus.DRAFT,
        publishedAt: data.publishedAt ?? (data.status === ContentStatus.PUBLISHED ? new Date() : null),
        authorId: data.authorId,
      },
    });
  }

  async update(id: string, organizationId: string, data: UpdatePageInput): Promise<Page> {
    return prisma.page.update({
      where: { id },
      data: {
        ...data,
        ...(data.status === ContentStatus.PUBLISHED && !data.publishedAt ? { publishedAt: new Date() } : {}),
      },
    });
  }

  async findById(id: string, organizationId: string): Promise<Page | null> {
    // MongoDB Prisma bug: deletedAt: null in where clause returns no results.
    const page = await prisma.page.findFirst({
      where: {
        id,
        organizationId,
      },
    });
    if (page?.deletedAt) return null;
    return page;
  }

  async findBySlug(slug: string, organizationId: string): Promise<Page | null> {
    // MongoDB Prisma bug: deletedAt: null in where clause returns no results.
    const page = await prisma.page.findFirst({
      where: {
        slug,
        organizationId,
      },
    });
    if (page?.deletedAt) return null;
    return page;
  }

  async list(organizationId: string, query: ListPagesQuery = {}) {
    const { search, status, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    // MongoDB Prisma bug: deletedAt: null removed from where; JS post-filter applied below.
    const where: Prisma.PageWhereInput = {
      organizationId,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { slug: { contains: search, mode: "insensitive" } },
              { content: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const allItems = await prisma.page.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const notDeleted = allItems.filter((p) => !p.deletedAt);
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

  async softDelete(id: string, organizationId: string): Promise<Page> {
    return prisma.page.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
