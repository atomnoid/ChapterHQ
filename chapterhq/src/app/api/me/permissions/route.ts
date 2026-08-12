import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AuthorizationService } from "@/services/permission/authorization.service";

const authorizationService = new AuthorizationService();

/**
 * GET /api/me/permissions
 *
 * Returns the current user's:
 *   - organization name and slug
 *   - assigned role names
 *   - flat list of permission strings (resource:action)
 *
 * No special permission is required — every authenticated member can
 * read their own context.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const userId = session.user.id;

    // Resolve org context, roles, and permissions via existing services.
    const context = await authorizationService.resolveContext(userId);
    const roles = await authorizationService.resolveCurrentRoles(userId);
    const permissions = await authorizationService.resolveCurrentPermissions(userId);

    const permissionStrings = permissions.map(
      (p) => `${p.resource}:${p.action}`
    );

    const roleNames = roles.map((r) => r.name);

    return NextResponse.json(
      {
        organization: {
          id: context.organization.id,
          name: context.organization.name,
          slug: context.organization.slug,
          status: context.organization.status,
        },
        roles: roleNames,
        permissions: permissionStrings,
        notificationAudience: {
          isOrganizationAdministrator: roles.some((role) => role.scope === "ORGANIZATION"),
          activeCommitteeId: context.activeCommitteeId ?? null,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "OrganizationContextNotFoundError") {
      return NextResponse.json(
        { message: "No active organization found." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
}
