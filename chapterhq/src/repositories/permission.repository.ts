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

  async replaceRolePermissions(roleId: string, permissionIds: string[]) {
    return prisma.$transaction([
      prisma.rolePermission.deleteMany({
        where: { roleId },
      }),
      prisma.rolePermission.createMany({
        data: permissionIds.map(permissionId => ({
          roleId,
          permissionId,
        })),
        skipDuplicates: true,
      }),
    ]);
  }

  async validatePermissionIds(permissionIds: string[]) {
    const validPermissions = await prisma.permission.findMany({
      where: {
        id: { in: permissionIds },
      },
      select: {
        id: true,
      },
    });
    return validPermissions.map(p => p.id);
  }
}
