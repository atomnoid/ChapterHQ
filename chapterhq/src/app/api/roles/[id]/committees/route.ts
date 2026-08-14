import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/roles/[id]/committees
// Returns the list of committees this role has access to
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const roleId = params.id;
    const organizationId = session.activeOrganizationId;

    if (!organizationId) {
      return apiResponse.forbidden("No active organization");
    }

    // Verify role exists and belongs to this organization
    const role = await prisma.role.findFirst({
      where: { id: roleId, organizationId },
    });

    if (!role || role.deletedAt) {
      return apiResponse.notFound("Role not found");
    }

    // Get all committees this role has access to
    const access = await prisma.roleCommitteeAccess.findMany({
      where: { roleId },
      include: {
        committee: {
          select: { id: true, name: true, description: true },
        },
      },
      orderBy: { committee: { name: "asc" } },
    });

    const committees = access.map((a) => ({
      id: a.committee.id,
      name: a.committee.name,
      description: a.committee.description,
    }));

    return apiResponse.success(committees);
  } catch (error) {
    console.error("[GET /api/roles/[id]/committees]", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return apiResponse.serverError();
  }
}

// POST /api/roles/[id]/committees
// Grant a role access to committees
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const roleId = params.id;
    const organizationId = session.activeOrganizationId;

    if (!organizationId) {
      return apiResponse.forbidden("No active organization");
    }

    const body = (await request.json()) as { committeeIds: string[] };
    const { committeeIds } = body;

    if (!Array.isArray(committeeIds)) {
      return apiResponse.badRequest("committeeIds must be an array");
    }

    // Verify role exists and belongs to this organization
    const role = await prisma.role.findFirst({
      where: { id: roleId, organizationId },
    });

    if (!role || role.deletedAt) {
      return apiResponse.notFound("Role not found");
    }

    // Verify all committees exist and belong to this organization
    const committees = await prisma.committee.findMany({
      where: {
        id: { in: committeeIds },
        organizationId,
      },
    });

    if (committees.length !== committeeIds.length) {
      return apiResponse.badRequest(
        "One or more committees not found in this organization"
      );
    }

    // Delete existing access records and create new ones
    await prisma.roleCommitteeAccess.deleteMany({
      where: { roleId },
    });

    // Create new access records
    const accessRecords = committeeIds.map((committeeId) => ({
      roleId,
      committeeId,
    }));

    await prisma.roleCommitteeAccess.createMany({
      data: accessRecords,
    });

    return apiResponse.success(
      { message: "Committee access updated successfully" },
      "Committee access updated"
    );
  } catch (error) {
    console.error("[POST /api/roles/[id]/committees]", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return apiResponse.serverError();
  }
}

// DELETE /api/roles/[id]/committees
// Remove all committee access from a role
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const roleId = params.id;
    const organizationId = session.activeOrganizationId;

    if (!organizationId) {
      return apiResponse.forbidden("No active organization");
    }

    // Verify role exists and belongs to this organization
    const role = await prisma.role.findFirst({
      where: { id: roleId, organizationId },
    });

    if (!role || role.deletedAt) {
      return apiResponse.notFound("Role not found");
    }

    // Delete all access records for this role
    await prisma.roleCommitteeAccess.deleteMany({
      where: { roleId },
    });

    return apiResponse.success(
      null,
      "Committee access cleared successfully"
    );
  } catch (error) {
    console.error("[DELETE /api/roles/[id]/committees]", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return apiResponse.serverError();
  }
}
