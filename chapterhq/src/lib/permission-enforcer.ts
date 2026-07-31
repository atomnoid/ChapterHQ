import { AuthorizationService } from "@/services/permission/authorization.service";

const authorizationService = new AuthorizationService();

/**
 * Reusable helper to enforce a single permission for a user.
 * Throws PermissionDeniedError if the user does not have the permission.
 */
export async function requirePermission(userId: string, permission: string) {
  return authorizationService.enforcePermission(userId, permission);
}

/**
 * Reusable helper to enforce at least one of the specified permissions for a user.
 * Throws PermissionDeniedError if the user does not have any of the permissions.
 */
export async function requireAnyPermission(userId: string, permissions: string[]) {
  return authorizationService.enforceAnyPermission(userId, permissions);
}
