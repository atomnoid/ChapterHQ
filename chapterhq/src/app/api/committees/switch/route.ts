import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { OrganizationContextService } from "@/services/session/organization-context.service";
import { prisma } from "@/lib/prisma";

const contextService = new OrganizationContextService();

// POST /api/committees/switch
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const body = await request.json();
    const { committeeId } = body as { committeeId?: string | null };

    // Resolve context of active organization
    let context;
    try {
      context = await contextService.resolve(session.user.id);
    } catch {
      return apiResponse.forbidden("No active organization context found.");
    }

    const { organizationId, member } = context;

    // Handle switching to null (unselecting active committee)
    if (committeeId === null || committeeId === undefined || committeeId === "") {
      return apiResponse.success(
        { activeCommitteeId: null },
        "Active committee cleared successfully."
      );
    }

    // 1. Verify committee exists, belongs to active organization, and is not deleted
    const committee = await prisma.committee.findFirst({
      where: {
        id: committeeId,
        organizationId,
      },
    });
    if (!committee || committee.deletedAt) {
      return apiResponse.notFound("Committee not found in the active organization.");
    }

    // 2. Check if user has access to this committee via:
    //    a. Direct committee membership
    //    b. Role-based committee access
    //    c. Organization-level admin role

    const userRoles = await prisma.userRole.findMany({
      where: { memberId: member.id },
      include: { role: true },
    });

    // Check if user is an organization-level admin
    const isOrgAdmin = userRoles.some(
      (ur) =>
        !ur.role.deletedAt &&
        ur.role.status === "ACTIVE" &&
        (ur.role.name === "Admin" || ur.role.name === "President")
    );

    if (isOrgAdmin) {
      // Admin can switch to any committee in the organization
      return apiResponse.success(
        { activeCommitteeId: committeeId },
        "Active committee switched successfully."
      );
    }

    // Check direct committee membership
    const committeeMember = await prisma.committeeMember.findFirst({
      where: {
        committeeId,
        memberId: member.id,
      },
    });

    if (committeeMember && !committeeMember.deletedAt) {
      return apiResponse.success(
        { activeCommitteeId: committeeId },
        "Active committee switched successfully."
      );
    }

    // Check role-based committee access
    const roleIds = userRoles.map((ur) => ur.roleId);
    if (roleIds.length > 0) {
      const roleAccess = await prisma.roleCommitteeAccess.findFirst({
        where: {
          roleId: { in: roleIds },
          committeeId,
        },
      });

      if (roleAccess) {
        return apiResponse.success(
          { activeCommitteeId: committeeId },
          "Active committee switched successfully."
        );
      }
    }

    return apiResponse.forbidden("You do not have access to this committee.");
  } catch (error) {
    return apiResponse.serverError();
  }
}
