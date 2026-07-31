import { prisma } from "@/lib/prisma";

export class DashboardRepository {
  async getSummary(organizationId: string, memberId: string) {
    const [totalMembers, totalRoles, totalPermissions, currentUserRoleCount] = await Promise.all([
      prisma.member.count({
        where: {
          organizationId,
          deletedAt: null,
        },
      }),
      prisma.role.count({
        where: {
          organizationId,
          deletedAt: null,
        },
      }),
      prisma.permission.count(),
      prisma.userRole.count({
        where: {
          memberId,
          role: {
            deletedAt: null,
            organizationId,
          },
        },
      }),
    ]);

    return {
      totalMembers,
      totalRoles,
      totalPermissions,
      currentUserRoleCount,
    };
  }
}
