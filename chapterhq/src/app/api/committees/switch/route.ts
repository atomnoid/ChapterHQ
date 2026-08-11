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

    // 2. Verify user has access to that committee
    // Either is active CommitteeMember OR has President role in organization
    const committeeMember = await prisma.committeeMember.findFirst({
      where: {
        committeeId,
        memberId: member.id,
      },
    });

    let hasAccess = !!(committeeMember && !committeeMember.deletedAt);

    if (!hasAccess) {
      const userRoles = await prisma.userRole.findMany({
        where: {
          memberId: member.id,
        },
        include: {
          role: true,
        },
      });
      const activeUserRoles = userRoles.filter((ur) => !ur.role.deletedAt);
      const isPresident = activeUserRoles.some((ur) => ur.role.name === "Admin" || ur.role.name === "President");
      if (isPresident) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      const appointments = await prisma.appointment.findMany({
        where: {
          committeeId,
          memberId: member.id,
          status: "ACTIVE",
          designation: {
            in: ["Committee Head", "Head", "Chairman", "Chair", "Committee Lead", "Lead"],
          },
        },
      });
      const hasActiveApp = appointments.some((a) => !a.deletedAt);
      if (hasActiveApp) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return apiResponse.forbidden("You do not have access to this committee.");
    }

    return apiResponse.success(
      { activeCommitteeId: committeeId },
      "Active committee switched successfully."
    );
  } catch (error) {
    return apiResponse.serverError();
  }
}
