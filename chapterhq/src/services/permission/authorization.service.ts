import { OrganizationContextService } from "@/services/session/organization-context.service";
import { UserRoleRepository } from "@/repositories/user-role.repository";
import { PermissionRepository } from "@/repositories/permission.repository";
import { PermissionDeniedError } from "@/types/errors";

type ResolvedPermission = {
  resource: string;
  action: string;
};

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
  async resolveAssignedRoles(userId: string) {
    const context = await this.resolveContext(userId);
    const userRoles = await this.userRoleRepository.findUserRoles(context.member.id);
    return userRoles
      .map(ur => ur.role)
      .filter((role) => role.organizationId === context.organizationId);
  }

  // Load Roles visible in the current organization/committee context
  async resolveCurrentRoles(userId: string) {
    const context = await this.resolveContext(userId);
    const roles = await this.resolveAssignedRoles(userId);

    return roles
      .filter(role => {
        if (!role.name.startsWith("[committeeId:")) return true;
        if (context.activeCommitteeId && role.name.startsWith(`[committeeId:${context.activeCommitteeId}]`)) {
          return true;
        }
        return false;
      })
      .map(role => {
        if (role.name.startsWith("[committeeId:")) {
          const cleanName = role.name.replace(/^\[committeeId:[^\]]+\]\s*/, "");
          return { ...role, name: cleanName };
        }
        return role;
      });
  }

  // Load Permissions resolved for current user
  async resolveCurrentPermissions(userId: string) {
    const context = await this.resolveContext(userId);
    const roles = await this.resolveCurrentRoles(userId);
    const roleIds = roles.map(r => r.id);
    let permissions: ResolvedPermission[] = [];
    
    if (roleIds.length > 0) {
      const rolePermissions = await this.permissionRepository.findRolePermissionsByRoleIds(roleIds);
      permissions = rolePermissions.map(rp => rp.permission);
    }

    if (context.activeCommitteeId) {
      const { isCommitteeHead } = await import("@/lib/committee-auth");
      const isHead = await isCommitteeHead(userId, context.organizationId, context.activeCommitteeId);
      if (isHead) {
        const allowedResources = ["events", "finance", "documents", "inventory", "announcements", "appointments", "notifications", "roles"];
        const actions = ["create", "read", "update", "delete"];
        allowedResources.forEach(res => {
          actions.forEach(act => {
            const exists = permissions.some(p => p.resource === res && p.action === act);
            if (!exists) {
              permissions.push({ resource: res, action: act });
            }
          });
        });
      }
    }

    return permissions;
  }

  // Enforce permission checks and throw PermissionDeniedError if not allowed
  async enforcePermission(userId: string, permission: string) {
    const context = await this.resolveContext(userId);
    const userRoles = await this.userRoleRepository.findUserRoles(context.member.id);
    const roleIds = userRoles.map(ur => ur.roleId);
    
    let hasPerm = false;
    if (roleIds.length > 0) {
      const rolePermissions = await this.permissionRepository.findRolePermissionsByRoleIds(roleIds);
      hasPerm = rolePermissions.some(
        rp => `${rp.permission.resource}:${rp.permission.action}` === permission
      );
    }

    if (!hasPerm && context.activeCommitteeId) {
      const [resource] = permission.split(":");
      const allowedResources = ["events", "finance", "documents", "inventory", "announcements", "appointments", "notifications", "roles"];
      if (allowedResources.includes(resource)) {
        const { isCommitteeHead } = await import("@/lib/committee-auth");
        const isHead = await isCommitteeHead(userId, context.organizationId, context.activeCommitteeId);
        if (isHead) {
          hasPerm = true;
        }
      }
    }

    if (!hasPerm) {
      throw new PermissionDeniedError();
    }

    return {
      context,
      member: context.member,
      roles: userRoles.map(ur => ur.role),
    };
  }

  // Enforce any permission checks and throw PermissionDeniedError if not allowed
  async enforceAnyPermission(userId: string, permissions: string[]) {
    const context = await this.resolveContext(userId);
    const userRoles = await this.userRoleRepository.findUserRoles(context.member.id);
    const roleIds = userRoles.map(ur => ur.roleId);
    
    let hasPerm = false;
    if (roleIds.length > 0) {
      const rolePermissions = await this.permissionRepository.findRolePermissionsByRoleIds(roleIds);
      hasPerm = rolePermissions.some(
        rp => permissions.includes(`${rp.permission.resource}:${rp.permission.action}`)
      );
    }

    if (!hasPerm && context.activeCommitteeId) {
      const { isCommitteeHead } = await import("@/lib/committee-auth");
      const isHead = await isCommitteeHead(userId, context.organizationId, context.activeCommitteeId);
      if (isHead) {
        const allowedResources = ["events", "finance", "documents", "inventory", "announcements", "appointments", "notifications", "roles"];
        hasPerm = permissions.some(p => {
          const [resource] = p.split(":");
          return allowedResources.includes(resource);
        });
      }
    }

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
