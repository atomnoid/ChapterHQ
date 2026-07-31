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
    return prisma.userRole.findMany({
      where: {
        memberId,
      },
      include: {
        role: true,
      },
    });
  }
}
