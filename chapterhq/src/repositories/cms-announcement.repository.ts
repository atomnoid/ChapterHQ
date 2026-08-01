import { prisma } from "@/lib/prisma";
import { Announcement, ContentStatus, PriorityLevel, Prisma } from "@prisma/client";

export interface CreateAnnouncementInput {
  organizationId: string;
  title: string;
  content: string;
  priority?: PriorityLevel;
  startDate?: Date;
  endDate?: Date;
  status?: ContentStatus;
  authorId?: string;
}

export interface UpdateAnnouncementInput {
  title?: string;
  content?: string;
  priority?: PriorityLevel;
  startDate?: Date;
  endDate?: Date;
  status?: ContentStatus;
}

export interface ListAnnouncementsQuery {
  search?: string;
  priority?: PriorityLevel;
  status?: ContentStatus;
  page?: number;
  limit?: number;
}

export class CMSAnnouncementRepository {
  async create(data: CreateAnnouncementInput): Promise<Announcement> {
    return prisma.announcement.create({
      data: {
        organizationId: data.organizationId,
        title: data.title,
        content: data.content,
        priority: data.priority ?? PriorityLevel.MEDIUM,
        startDate: data.startDate,
        endDate: data.endDate,
        status: data.status ?? ContentStatus.PUBLISHED,
        authorId: data.authorId,
      },
    });
  }

  async update(id: string, organizationId: string, data: UpdateAnnouncementInput): Promise<Announcement> {
    return prisma.announcement.update({
      where: { id },
      data,
    });
  }

  async findById(id: string, organizationId: string): Promise<Announcement | null> {
    return prisma.announcement.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
    });
  }

  async list(organizationId: string, query: ListAnnouncementsQuery = {}) {
    const { search, priority, status, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.AnnouncementWhereInput = {
      organizationId,
      deletedAt: null,
      ...(priority ? { priority } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { content: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.announcement.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async softDelete(id: string, organizationId: string): Promise<Announcement> {
    return prisma.announcement.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
