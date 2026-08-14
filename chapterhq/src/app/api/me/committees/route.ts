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

    // Direct committee assignment is the only allowed access path.
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

    const committees = memberships
      .filter(
        (cm) =>
          !cm.deletedAt &&
          cm.committee.organizationId === organizationId &&
          !cm.committee.deletedAt
      )
      .map((cm) => ({
        id: cm.committee.id,
        name: cm.committee.name,
        description: cm.committee.description ?? null,
      }))
      .filter((c, index, array) => array.findIndex((item) => item.id === c.id) === index)
      .sort((a, b) => a.name.localeCompare(b.name));

    // Shape: { id, name, description }
    return apiResponse.success(
      committees.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description ?? null,
      }))
    );
  } catch {
    return apiResponse.serverError();
  }
}
