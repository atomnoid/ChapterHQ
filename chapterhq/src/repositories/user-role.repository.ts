import { prisma } from "@/lib/prisma";

interface CreateUserRoleData {
  memberId: string;
  roleId: string;
}

export class UserRoleRepository {
  async create(data: CreateUserRoleData) {
    return prisma.userRole.create({
      data: {
        memberId: data.memberId,
        roleId: data.roleId,
      },
    });
  }

  async findByMemberAndRole(memberId: string, roleId: string) {
    return prisma.userRole.findFirst({
      where: {
        memberId,
        roleId,
      },
    });
  }

  async findUserRoles(memberId: string) {
    // MongoDB Prisma bug: nested relation filter { role: { deletedAt: null } } returns no results.
    const userRoles = await prisma.userRole.findMany({
      where: { memberId },
      include: { role: true },
    });
    // Post-filter: exclude assignments where the role has been soft-deleted.
    return userRoles.filter((ur) => !ur.role.deletedAt);
  }

  async delete(memberId: string, roleId: string) {
    return prisma.userRole.delete({
      where: {
        memberId_roleId: {
          memberId,
          roleId,
        },
      },
    });
  }
}
