import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { buildOrderBy, PaginationParams } from "@/lib/pagination";

interface CreateCommitteeData {
  organizationId: string;
  name: string;
  description?: string;
}

interface UpdateCommitteeData {
  name?: string;
  description?: string;
}

export class CommitteeRepository {
  async create(data: CreateCommitteeData) {
    return prisma.committee.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        description: data.description,
      },
    });
  }

  async update(id: string, organizationId: string, data: UpdateCommitteeData) {
    return prisma.committee.update({
      where: {
        id,
        organizationId,
      },
      data,
    });
  }

  async findById(id: string, organizationId: string) {
    // MongoDB Prisma bug: deletedAt: null in where clause returns no results.
    const committee = await prisma.committee.findFirst({
      where: { id, organizationId },
    });
    if (committee?.deletedAt) return null;
    return committee;
  }

  async list(params: PaginationParams & { organizationId: string }) {
    const whereClause: Prisma.CommitteeWhereInput = {
      organizationId: params.organizationId,
      // MongoDB Prisma bug: deletedAt: null removed; JS post-filter applied below.
    };

    if (params.search) {
      whereClause.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { description: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const orderBy = buildOrderBy(params.sortBy, params.order, "createdAt");

    const allItems = await prisma.committee.findMany({
      where: whereClause,
      include: {
        appointments: {
          where: {
            status: "ACTIVE",
            deletedAt: null,
            designation: {
              in: ["Committee Head", "Head", "Chairman", "Chair", "Committee Lead", "Lead"],
            },
          },
          include: {
            member: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy,
    });

    const notDeleted = allItems.filter((c) => !c.deletedAt);
    const total = notDeleted.length;
    const items = notDeleted.slice(params.skip, params.skip + params.take);

    return { total, items };
  }

  async existsByName(organizationId: string, name: string, excludeId?: string) {
    // MongoDB Prisma bug: deletedAt: null in where clause returns no results.
    const committee = await prisma.committee.findFirst({
      where: {
        organizationId,
        name: { equals: name, mode: "insensitive" },
        NOT: excludeId ? { id: excludeId } : undefined,
      },
    });
    if (committee?.deletedAt) return false;
    return !!committee;
  }

  async softDelete(id: string, organizationId: string) {
    return prisma.committee.update({
      where: {
        id,
        organizationId,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
