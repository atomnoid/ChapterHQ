import { prisma } from "@/lib/prisma";
import type { RoleScope } from "@prisma/client";
import { buildOrderBy, PaginationParams } from "@/lib/pagination";

interface CreateRoleData {
  organizationId: string;
  name: string;
  scope: RoleScope;
}

export class RoleRepository {
  async create(data: CreateRoleData) {
    return prisma.role.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        scope: data.scope,
      },
    });
  }

  async createMany(roles: CreateRoleData[]) {
    return prisma.role.createMany({
      data: roles.map((r) => ({
        organizationId: r.organizationId,
        name: r.name,
        scope: r.scope,
      })),
      skipDuplicates: true,
    });
  }

  async findByOrganizationAndName(organizationId: string, name: string) {
    return prisma.role.findFirst({
      where: {
        deletedAt: null,
        organizationId,
        name,
      },
    });
  }

  async findManyByOrganization(organizationId: string) {
    return prisma.role.findMany({
      where: {
        deletedAt: null,
        organizationId,
      },
    });
  }

  async existsByName(organizationId: string, name: string, excludeId?: string) {
    const role = await prisma.role.findFirst({
      where: {
        deletedAt: null,
        organizationId,
        name: { equals: name, mode: "insensitive" },
        NOT: excludeId ? { id: excludeId } : undefined,
      },
    });
    return !!role;
  }

  async findById(id: string, organizationId: string) {
    return prisma.role.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
    });
  }

  async listByOrganization(params: PaginationParams & { organizationId: string }) {
    const whereClause: any = {
      organizationId: params.organizationId,
      deletedAt: null,
    };

    if (params.search) {
      whereClause.name = { contains: params.search, mode: "insensitive" };
    }

    const orderBy = buildOrderBy(params.sortBy, params.order, "createdAt");

    const [total, items] = await Promise.all([
      prisma.role.count({ where: whereClause }),
      prisma.role.findMany({
        where: whereClause,
        skip: params.skip,
        take: params.take,
        orderBy,
        include: {
          _count: {
            select: {
              permissions: true,
              userRoles: true,
            },
          },
        },
      }),
    ]);

    return { total, items };
  }

  async update(id: string, organizationId: string, data: { name?: string; description?: string; scope?: any }) {
    return prisma.role.update({
      where: {
        id,
        organizationId,
      },
      data,
    });
  }

  async softDelete(id: string, organizationId: string) {
    return prisma.role.update({
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
