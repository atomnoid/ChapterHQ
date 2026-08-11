import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/me/committees
// Returns the list of committees the authenticated user is permitted to access
// within their active organization. Presidents/Admins receive all committees.
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

    // Check if this member holds the President role (organization-wide access).
    const userRoles = await prisma.userRole.findMany({
      where: { memberId: member.id },
      include: { role: { select: { name: true, deletedAt: true } } },
    });
    const isPresident = userRoles.some(
      (ur) => !ur.role.deletedAt && (ur.role.name === "Admin" || ur.role.name === "President")
    );

    let committees;

    if (isPresident) {
      // Presidents can access every non-deleted committee in the organization.
      const all = await prisma.committee.findMany({
        where: { organizationId },
        orderBy: { name: "asc" },
      });
      committees = all.filter((c) => !c.deletedAt);
    } else {
      // Regular members only see committees they are assigned to.
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

      committees = memberships
        .filter(
          (cm) =>
            !cm.deletedAt &&
            cm.committee.organizationId === organizationId &&
            !cm.committee.deletedAt
        )
        .map((cm) => cm.committee)
        // Deduplicate by id (edge case: duplicate membership rows).
        .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i)
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    // Shape: { id, name, description }
    return apiResponse.success(
      committees.map((c) => ({
        id: c.id,
        name: c.name,
        description: (c as any).description ?? null,
      }))
    );
  } catch {
    return apiResponse.serverError();
  }
}
