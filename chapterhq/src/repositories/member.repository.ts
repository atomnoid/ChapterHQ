import { prisma } from "@/lib/prisma";

interface CreateMemberData {
  organizationId: string;
  userId: string;
}

export class MemberRepository {
  async create(data: CreateMemberData) {
    return prisma.member.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
      },
    });
  }

  async findByOrganizationAndUser(organizationId: string, userId: string) {
    return prisma.member.findFirst({
      where: {
        deletedAt: null,
        organizationId,
        userId,
      },
    });
  }

  async findActiveByUserId(userId: string) {
    return prisma.member.findFirst({
      where: {
        deletedAt: null,
        userId,
        status: "ACTIVE",
        organization: {
          deletedAt: null,
        },
      },
      include: {
        organization: true,
      },
    });
  }

  async findByIdAndOrganization(id: string, organizationId: string) {
    return prisma.member.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });
  }

  async list(params: {
    organizationId: string;
    search?: string;
    status?: any;
    skip: number;
    take: number;
  }) {
    const whereClause: any = {
      organizationId: params.organizationId,
      deletedAt: null,
    };

    if (params.status) {
      whereClause.status = params.status;
    }

    if (params.search) {
      whereClause.user = {
        OR: [
          { name: { contains: params.search, mode: "insensitive" } },
          { email: { contains: params.search, mode: "insensitive" } },
        ],
      };
    }

    const [total, items] = await Promise.all([
      prisma.member.count({ where: whereClause }),
      prisma.member.findMany({
        where: whereClause,
        skip: params.skip,
        take: params.take,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: {
          joinedAt: "desc",
        },
      }),
    ]);

    return { total, items };
  }

  async update(id: string, organizationId: string, data: { status?: any }) {
    return prisma.member.update({
      where: {
        id,
        organizationId,
      },
      data,
    });
  }

  async delete(id: string, organizationId: string) {
    return prisma.member.update({
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
