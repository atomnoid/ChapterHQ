import { prisma } from "@/lib/prisma";

export class DashboardRepository {
  async getSummary(organizationId: string, memberId: string) {
    // MongoDB Prisma bug: deletedAt: null in where clause (including nested relation filters)
    // returns no results. Using findMany + JS filter instead of count().
    const [memberRows, roleRows, userRoleRows] = await Promise.all([
      prisma.member.findMany({
        where: { organizationId },
        select: { id: true, deletedAt: true },
      }),
      prisma.role.findMany({
        where: { organizationId },
        select: { id: true, deletedAt: true },
      }),
      prisma.userRole.findMany({
        where: { memberId },
        include: { role: { select: { id: true, deletedAt: true, organizationId: true } } },
      }),
    ]);

    const totalMembers = memberRows.filter((m) => !m.deletedAt).length;
    const totalRoles = roleRows.filter((r) => !r.deletedAt).length;
    const totalPermissions = await prisma.permission.count();
    const currentUserRoleCount = userRoleRows.filter(
      (ur) => !ur.role.deletedAt && ur.role.organizationId === organizationId
    ).length;

    return {
      totalMembers,
      totalRoles,
      totalPermissions,
      currentUserRoleCount,
    };
  }

  async getActivity(organizationId: string, limit = 15) {
    // MongoDB Prisma bug: deletedAt: null (including nested relation filters) returns no results.
    // Fetch without filters and post-filter in JS.
    const [allMembers, allRoles, allUserRoles, organization] = await Promise.all([
      // 1. Members updates / creations
      prisma.member.findMany({
        where: { organizationId },
        orderBy: { updatedAt: "desc" },
        take: limit * 2, // over-fetch to account for filtered-out deleted records
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      }),
      // 2. Roles updates / creations
      prisma.role.findMany({
        where: { organizationId },
        orderBy: { updatedAt: "desc" },
        take: limit * 2,
      }),
      // 3. Role assignments
      prisma.userRole.findMany({
        where: {
          member: { organizationId },
        },
        orderBy: { assignedAt: "desc" },
        take: limit * 2,
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
        where: { id: organizationId },
      }),
    ]);

    // Post-filter soft-deleted records in JS.
    const members = allMembers.filter((m) => !m.deletedAt);
    const roles = allRoles.filter((r) => !r.deletedAt);
    const userRoles = allUserRoles.filter(
      (ur) => !ur.member.deletedAt && !ur.role.deletedAt
    );
    // Only show organization if it has not been soft-deleted.
    const org = organization?.deletedAt ? null : organization;

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

    if (org) {
      activities.push({
        type: "organization_created",
        timestamp: org.createdAt,
        details: {
          id: org.id,
          name: org.name,
          slug: org.slug,
        },
      });
    }

    // Sort newest first and limit to requested count
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
}
