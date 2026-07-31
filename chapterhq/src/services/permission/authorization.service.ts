import { OrganizationContextService } from "@/services/session/organization-context.service";
import { UserRoleRepository } from "@/repositories/user-role.repository";
import { PermissionRepository } from "@/repositories/permission.repository";
import { PermissionDeniedError } from "@/types/errors";

export class AuthorizationService {
  constructor(
    private readonly contextService = new OrganizationContextService(),
    private readonly userRoleRepository = new UserRoleRepository(),
    private readonly permissionRepository = new PermissionRepository()
  ) {}

  // Resolve context (Member, Organization, and OrganizationId)
  async resolveContext(userId: string) {
    return this.contextService.resolve(userId);
  }

  // Load Member for the active user
  async resolveCurrentMember(userId: string) {
    const context = await this.resolveContext(userId);
    return context.member;
  }

  // Load Roles assigned to the user/member in the organization context
  async resolveCurrentRoles(userId: string) {
    const context = await this.resolveContext(userId);
    const userRoles = await this.userRoleRepository.findUserRoles(context.member.id);
    return userRoles.map(ur => ur.role);
  }

  // Load Permissions resolved for current user
  async resolveCurrentPermissions(userId: string) {
    const roles = await this.resolveCurrentRoles(userId);
    const roleIds = roles.map(r => r.id);
    if (roleIds.length === 0) return [];
    
    const rolePermissions = await this.permissionRepository.findRolePermissionsByRoleIds(roleIds);
    return rolePermissions.map(rp => rp.permission);
  }

  // Enforce permission checks and throw PermissionDeniedError if not allowed
  async enforcePermission(userId: string, permission: string) {
    const context = await this.resolveContext(userId);
    const userRoles = await this.userRoleRepository.findUserRoles(context.member.id);
    const roleIds = userRoles.map(ur => ur.roleId);
    if (roleIds.length === 0) throw new PermissionDeniedError();

    const rolePermissions = await this.permissionRepository.findRolePermissionsByRoleIds(roleIds);
    const hasPerm = rolePermissions.some(
      rp => `${rp.permission.resource}:${rp.permission.action}` === permission
    );

    if (!hasPerm) {
      throw new PermissionDeniedError();
    }

    return {
      context,
      member: context.member,
      roles: userRoles.map(ur => ur.role),
    };
  }
}
