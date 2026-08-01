import { prisma } from "@/lib/prisma";
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
    return prisma.committee.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
    });
  }

  async list(params: PaginationParams & { organizationId: string }) {
    const whereClause: any = {
      organizationId: params.organizationId,
      deletedAt: null,
    };

    if (params.search) {
      whereClause.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { description: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const orderBy = buildOrderBy(params.sortBy, params.order, "createdAt");

    const [total, items] = await Promise.all([
      prisma.committee.count({ where: whereClause }),
      prisma.committee.findMany({
        where: whereClause,
        skip: params.skip,
        take: params.take,
        orderBy,
      }),
    ]);

    return { total, items };
  }

  async existsByName(organizationId: string, name: string, excludeId?: string) {
    const committee = await prisma.committee.findFirst({
      where: {
        deletedAt: null,
        organizationId,
        name: { equals: name, mode: "insensitive" },
        NOT: excludeId ? { id: excludeId } : undefined,
      },
    });
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
