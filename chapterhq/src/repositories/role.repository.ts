import { prisma } from "@/lib/prisma";
import type { RoleScope } from "@prisma/client";

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
}
