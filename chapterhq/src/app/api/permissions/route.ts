import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { PermissionService } from "@/services/permission/permission.service";

const permissionService = new PermissionService();

// GET /api/permissions
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    // Require roles:read permission to view all system permissions
    await requirePermission(session.user.id, "roles:read");

    const permissions = await permissionService.getPermissions();

    // Group permissions by resource
    const groupsMap = new Map<string, typeof permissions>();
    permissions.forEach((perm) => {
      const group = groupsMap.get(perm.resource) || [];
      group.push(perm);
      groupsMap.set(perm.resource, group);
    });

    const result = Array.from(groupsMap.entries()).map(([resource, perms]) => ({
      resource,
      permissions: perms,
    }));

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") {
      return NextResponse.json({ message: "Permission denied." }, { status: 403 });
    }
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
