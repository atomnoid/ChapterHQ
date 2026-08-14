import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/me/committees
// Returns the list of committees the authenticated user is permitted to access
// within their active organization. Presidents/Admins receive all committees.
// Other users only see committees they are assigned to, limited by role-based access.
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const userId = session.user.id;
    const organizationId = session.activeOrganizationId;

    if (!organizationId) {
      return apiResponse.success([]);
    }

    // Locate the active member record for this user in this organization.
    const member = await prisma.member.findFirst({
      where: { userId, organizationId, status: "ACTIVE" },
    });

    if (!member || member.deletedAt) {
      return apiResponse.success([]);
    }

    // Get user's roles to check for admin access
    const userRoles = await prisma.userRole.findMany({
      where: { memberId: member.id },
      include: { role: true },
    });

    // Check if user is an organization-level admin (Admin or President role)
    const isOrgAdmin = userRoles.some(
      (ur) =>
        !ur.role.deletedAt &&
        ur.role.status === "ACTIVE" &&
        (ur.role.name === "Admin" || ur.role.name === "President")
    );

    console.log("[GET /api/me/committees]", {
      userId,
      organizationId,
      memberId: member.id,
      userRolesCount: userRoles.length,
      userRoles: userRoles.map((ur) => ({
        roleId: ur.roleId,
        roleName: ur.role.name,
        roleStatus: ur.role.status,
        roleDeleted: ur.role.deletedAt,
      })),
      isOrgAdmin,
    });

    let committees: Array<{
      id: string;
      name: string;
      description: string | null;
    }>;

    if (isOrgAdmin) {
      // Admins can access all committees in the organization
      // Note: MongoDB Prisma bug with deletedAt: null, so we fetch all and filter in JS
      const allCommittees = await prisma.committee.findMany({
        where: {
          organizationId,
        },
        select: {
          id: true,
          name: true,
          description: true,
          deletedAt: true,
        },
      });
      // Filter out deleted committees in JavaScript
      committees = allCommittees
        .filter((c) => !c.deletedAt)
        .map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description ?? null,
        }));
      console.log("[GET /api/me/committees] Admin - all committees:", {
        totalFetched: allCommittees.length,
        notDeleted: committees.length,
        committees: committees.map((c) => ({ id: c.id, name: c.name })),
      });
    } else {
      // For non-admins, fetch committees via:
      // 1. Direct committee membership
      // 2. Role-based committee access
      const memberships = await prisma.committeeMember.findMany({
        where: { memberId: member.id },
        include: {
          committee: {
            select: {
              id: true,
              name: true,
              description: true,
              organizationId: true,
              deletedAt: true,
            },
          },
        },
      });

      const roleIds = userRoles.map((ur) => ur.roleId);
      const roleAccessList = roleIds.length > 0
        ? await prisma.roleCommitteeAccess.findMany({
            where: { roleId: { in: roleIds } },
            include: {
              committee: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  organizationId: true,
                  deletedAt: true,
                },
              },
            },
          })
        : [];

      // Combine from both sources and deduplicate
      const committeesMap = new Map<
        string,
        { id: string; name: string; description: string | null }
      >();

      // Add direct memberships (filter out deleted)
      memberships.forEach((cm) => {
        if (
          !cm.deletedAt &&
          cm.committee.organizationId === organizationId &&
          !cm.committee.deletedAt
        ) {
          committeesMap.set(cm.committee.id, {
            id: cm.committee.id,
            name: cm.committee.name,
            description: cm.committee.description ?? null,
          });
        }
      });

      // Add role-based access (filter out deleted)
      roleAccessList.forEach((ra) => {
        if (
          ra.committee.organizationId === organizationId &&
          !ra.committee.deletedAt
        ) {
          committeesMap.set(ra.committee.id, {
            id: ra.committee.id,
            name: ra.committee.name,
            description: ra.committee.description ?? null,
          });
        }
      });

      committees = Array.from(committeesMap.values());
    }

    // Sort by name
    committees.sort((a, b) => a.name.localeCompare(b.name));

    console.log("[GET /api/me/committees] Final response:", {
      isOrgAdmin,
      committeeCount: committees.length,
      committees: committees.map((c) => ({ id: c.id, name: c.name })),
    });

    // Shape: { isAdmin, committees: [...] }
    return apiResponse.success({
      isAdmin: isOrgAdmin,
      committees: committees.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description ?? null,
      })),
    });
  } catch (error) {
    console.error("[GET /api/me/committees] Error:", error);
    return apiResponse.serverError();
  }
}
