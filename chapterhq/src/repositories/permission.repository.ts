import { prisma } from "@/lib/prisma";

export class PermissionRepository {
  async ensurePermissionsExist(permissions: { resource: string; action: string }[]) {
    // MongoDB createMany does not return generated ids when skipDuplicates: true is used,
    // so we will query them after ensuring they exist.
    await prisma.permission.createMany({
      data: permissions,
      skipDuplicates: true,
    });
    return prisma.permission.findMany();
  }

  async findPermissions() {
    return prisma.permission.findMany();
  }

  async findRolePermissions(roleId: string) {
    return prisma.rolePermission.findMany({
      where: {
        roleId,
      },
      include: {
        permission: true,
      },
    });
  }

  async findRolePermissionsByRoleIds(roleIds: string[]) {
    return prisma.rolePermission.findMany({
      where: {
        roleId: { in: roleIds },
      },
      include: {
        permission: true,
      },
    });
  }

  async createRolePermissions(data: { roleId: string; permissionId: string }[]) {
    return prisma.rolePermission.createMany({
      data,
      skipDuplicates: true,
    });
  }
}
