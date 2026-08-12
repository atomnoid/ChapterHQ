import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export class PermissionRepository {
  async ensurePermissionsExist(permissions: { resource: string; action: string }[]) {
    const existing = await prisma.permission.findMany();
    const toCreate = permissions.filter(p =>
      !existing.some(e => e.resource === p.resource && e.action === p.action)
    );

    if (toCreate.length > 0) {
      await prisma.permission.createMany({
        data: toCreate.map(p => ({
          id: randomBytes(12).toString("hex"),
          resource: p.resource,
          action: p.action,
        }))
      });
    }
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
      data: data.map(d => ({
        id: randomBytes(12).toString("hex"),
        roleId: d.roleId,
        permissionId: d.permissionId,
      })),
    });
  }

  async replaceRolePermissions(roleId: string, permissionIds: string[]) {
    return prisma.$transaction([
      prisma.rolePermission.deleteMany({
        where: { roleId },
      }),
      prisma.rolePermission.createMany({
        data: permissionIds.map(permissionId => ({
          id: randomBytes(12).toString("hex"),
          roleId,
          permissionId,
        })),
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
