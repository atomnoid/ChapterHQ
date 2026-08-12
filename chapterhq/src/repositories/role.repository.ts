import { prisma } from "@/lib/prisma";
import type { Prisma, RoleScope } from "@prisma/client";
import { buildOrderBy, PaginationParams } from "@/lib/pagination";
import { randomBytes } from "crypto";

interface CreateRoleData {
  organizationId: string;
  name: string;
  scope: RoleScope;
  description?: string;
}

export class RoleRepository {
  async create(data: CreateRoleData) {
    return prisma.role.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        scope: data.scope,
        description: data.description,
      },
    });
  }

  async createMany(roles: CreateRoleData[]) {
    return prisma.role.createMany({
      data: roles.map((r) => ({
        id: randomBytes(12).toString("hex"),
        organizationId: r.organizationId,
        name: r.name,
        scope: r.scope,
      })),
    });
  }

  async findByOrganizationAndName(organizationId: string, name: string) {
    // MongoDB Prisma bug: deletedAt: null in where clause returns no results.
    const role = await prisma.role.findFirst({
      where: { organizationId, name },
    });
    if (role?.deletedAt || role?.status !== "ACTIVE") return null;
    return role;
  }

  async findManyByOrganizationAndName(organizationId: string, name: string, excludeId?: string) {
    return prisma.role.findMany({
      where: {
        organizationId,
        name: { equals: name, mode: "insensitive" },
        NOT: excludeId ? { id: excludeId } : undefined,
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async findActiveByOrganizationAndName(organizationId: string, name: string, excludeId?: string) {
    const roles = await this.findManyByOrganizationAndName(organizationId, name, excludeId);
    return roles.find((role) => !role.deletedAt && role.status === "ACTIVE") ?? null;
  }

  async findSoftDeletedByOrganizationAndName(organizationId: string, name: string) {
    const roles = await this.findManyByOrganizationAndName(organizationId, name);
    return roles.find((role) => !!role.deletedAt) ?? null;
  }

  async findManyByOrganization(organizationId: string) {
    // MongoDB Prisma bug: deletedAt: null in where clause returns no results.
    const roles = await prisma.role.findMany({
      where: { organizationId },
    });
    return roles.filter((r) => !r.deletedAt && r.status === "ACTIVE");
  }

  async existsByName(organizationId: string, name: string, excludeId?: string) {
    const role = await this.findActiveByOrganizationAndName(organizationId, name, excludeId);
    return !!role;
  }

  async findById(id: string, organizationId: string) {
    // MongoDB Prisma bug: deletedAt: null in where clause returns no results.
    const role = await prisma.role.findFirst({
      where: { id, organizationId },
    });
    if (role?.deletedAt || role?.status !== "ACTIVE") return null;
    return role;
  }

  async listByOrganization(params: PaginationParams & { organizationId: string }) {
    const whereClause: Prisma.RoleWhereInput = {
      organizationId: params.organizationId,
      // MongoDB Prisma bug: deletedAt: null removed; JS post-filter applied below.
    };

    if (params.search) {
      whereClause.name = { contains: params.search, mode: "insensitive" };
    }

    const orderBy = buildOrderBy(params.sortBy, params.order, "createdAt");

    const allItems = await prisma.role.findMany({
      where: whereClause,
      orderBy,
      include: {
        _count: {
          select: {
            rolePermissions: true,
            userRoles: true,
          },
        },
      },
    });

    // Post-filter soft-deleted records in JS (MongoDB Prisma bug workaround).
    const notDeleted = allItems.filter((r) => !r.deletedAt && r.status === "ACTIVE");
    const total = notDeleted.length;
    const items = notDeleted.slice(params.skip, params.skip + params.take);

    return { total, items };
  }

  async update(id: string, organizationId: string, data: { name?: string; description?: string; scope?: RoleScope }) {
    return prisma.role.update({
      where: {
        id,
        organizationId,
      },
      data,
    });
  }

  async restore(id: string, organizationId: string, data: { description?: string; scope?: RoleScope }) {
    return prisma.role.update({
      where: {
        id,
        organizationId,
      },
      data: {
        deletedAt: null,
        status: "ACTIVE",
        description: data.description,
        scope: data.scope,
      },
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
