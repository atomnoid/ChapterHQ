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

  async getActivity(organizationId: string, limit = 15) {
    const [members, roles, userRoles, organization] = await Promise.all([
      // 1. Members updates / creations
      prisma.member.findMany({
        where: { organizationId, deletedAt: null },
        orderBy: { updatedAt: "desc" },
        take: limit,
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      }),
      // 2. Roles updates / creations
      prisma.role.findMany({
        where: { organizationId, deletedAt: null },
        orderBy: { updatedAt: "desc" },
        take: limit,
      }),
      // 3. Role assignments
      prisma.userRole.findMany({
        where: {
          member: {
            organizationId,
            deletedAt: null,
          },
          role: {
            deletedAt: null,
          },
        },
        orderBy: { assignedAt: "desc" },
        take: limit,
        include: {
          member: {
            include: {
              user: {
                select: { name: true, email: true },
              },
            },
          },
          role: true,
        },
      }),
      // 4. Organization creations/updates
      prisma.organization.findFirst({
        where: { id: organizationId, deletedAt: null },
      }),
    ]);

    // Format activities
    const activities: any[] = [];

    members.forEach((m) => {
      const type = m.createdAt.getTime() === m.updatedAt.getTime() ? "member_created" : "member_updated";
      activities.push({
        type,
        timestamp: m.updatedAt,
        details: {
          memberId: m.id,
          name: m.user?.name,
          email: m.user?.email,
          status: m.status,
        },
      });
    });

    roles.forEach((r) => {
      const type = r.createdAt.getTime() === r.updatedAt.getTime() ? "role_created" : "role_updated";
      activities.push({
        type,
        timestamp: r.updatedAt,
        details: {
          roleId: r.id,
          name: r.name,
          scope: r.scope,
          status: r.status,
        },
      });
    });

    userRoles.forEach((ur) => {
      activities.push({
        type: "role_assigned",
        timestamp: ur.assignedAt,
        details: {
          memberId: ur.memberId,
          roleId: ur.roleId,
          memberName: ur.member.user?.name,
          roleName: ur.role.name,
        },
      });
    });

    if (organization) {
      activities.push({
        type: "organization_created",
        timestamp: organization.createdAt,
        details: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        },
      });
    }

    // Sort newest first and limit to requested count
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
}
