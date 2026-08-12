import { PermissionRepository } from "@/repositories/permission.repository";
import { RoleRepository } from "@/repositories/role.repository";
import { UserRoleRepository } from "@/repositories/user-role.repository";
import { MemberRepository } from "@/repositories/member.repository";
import {
  ALL_PERMISSIONS,
  SECRETARY_RESOURCES,
  TREASURER_RESOURCES,
} from "@/constants/permissions";
import { RoleNotFoundError } from "@/services/role.service";

type PermissionResource = (typeof SECRETARY_RESOURCES)[number] | (typeof TREASURER_RESOURCES)[number];

function isPermissionResource(resource: string): resource is PermissionResource {
  return [...SECRETARY_RESOURCES, ...TREASURER_RESOURCES].includes(resource as PermissionResource);
}

export class PermissionService {
  constructor(
    private readonly permissionRepository = new PermissionRepository(),
    private readonly roleRepository = new RoleRepository(),
    private readonly userRoleRepository = new UserRoleRepository(),
    private readonly memberRepository = new MemberRepository()
  ) {}

  async seedDefaultPermissionsAndMappings(organizationId: string) {
    // 1. Seed all permissions globally (resource:action)
    const permissionObjects = ALL_PERMISSIONS.map(p => {
      const [resource, action] = p.split(":");
      return { resource, action };
    });
    const allDbPermissions = await this.permissionRepository.ensurePermissionsExist(permissionObjects);

    // 2. Fetch all roles for the organization
    const roles = await this.roleRepository.findManyByOrganization(organizationId);

    const presidentRole = roles.find(r => r.name === "Admin" || r.name === "President");
    const secretaryRole = roles.find(r => r.name === "Secretary");
    const treasurerRole = roles.find(r => r.name === "Treasurer");
    const memberRole = roles.find(r => r.name === "Member");

    const rolePermissionsData: { roleId: string; permissionId: string }[] = [];

    // Owner role (Admin/President) gets ALL permissions
    if (presidentRole) {
      allDbPermissions.forEach(p => {
        rolePermissionsData.push({ roleId: presidentRole.id, permissionId: p.id });
      });
    }

    // Secretary gets specific resources and all actions
    if (secretaryRole) {
      allDbPermissions.forEach(p => {
        if (isPermissionResource(p.resource) && SECRETARY_RESOURCES.includes(p.resource)) {
          rolePermissionsData.push({ roleId: secretaryRole.id, permissionId: p.id });
        }
      });
    }

    // Treasurer gets specific resources and all actions
    if (treasurerRole) {
      allDbPermissions.forEach(p => {
        if (isPermissionResource(p.resource) && TREASURER_RESOURCES.includes(p.resource)) {
          rolePermissionsData.push({ roleId: treasurerRole.id, permissionId: p.id });
        }
      });
    }

    // Member gets read-only permissions for all resources
    if (memberRole) {
      allDbPermissions.forEach(p => {
        if (p.action === "read") {
          rolePermissionsData.push({ roleId: memberRole.id, permissionId: p.id });
        }
      });
    }

    if (rolePermissionsData.length > 0) {
      await this.permissionRepository.createRolePermissions(rolePermissionsData);
    }
  }

  async hasPermission(organizationId: string, userId: string, permission: string): Promise<boolean> {
    const member = await this.memberRepository.findByOrganizationAndUser(organizationId, userId);
    if (!member || member.status !== "ACTIVE") return false;

    const activeRoles = await this.userRoleRepository.findUserRoles(member.id);
    const orgRoles = activeRoles.filter(ur => ur.role.organizationId === organizationId && ur.role.status === "ACTIVE");
    if (orgRoles.length === 0) return false;

    const roleIds = orgRoles.map(ur => ur.roleId);
    const rolePermissions = await this.permissionRepository.findRolePermissionsByRoleIds(roleIds);

    return rolePermissions.some(rp => `${rp.permission.resource}:${rp.permission.action}` === permission);
  }

  async hasAnyPermission(organizationId: string, userId: string, permissions: string[]): Promise<boolean> {
    const member = await this.memberRepository.findByOrganizationAndUser(organizationId, userId);
    if (!member || member.status !== "ACTIVE") return false;

    const activeRoles = await this.userRoleRepository.findUserRoles(member.id);
    const orgRoles = activeRoles.filter(ur => ur.role.organizationId === organizationId && ur.role.status === "ACTIVE");
    if (orgRoles.length === 0) return false;

    const roleIds = orgRoles.map(ur => ur.roleId);
    const rolePermissions = await this.permissionRepository.findRolePermissionsByRoleIds(roleIds);

    return rolePermissions.some(rp =>
      permissions.includes(`${rp.permission.resource}:${rp.permission.action}`)
    );
  }

  async hasAllPermissions(organizationId: string, userId: string, permissions: string[]): Promise<boolean> {
    const member = await this.memberRepository.findByOrganizationAndUser(organizationId, userId);
    if (!member || member.status !== "ACTIVE") return false;

    const activeRoles = await this.userRoleRepository.findUserRoles(member.id);
    const orgRoles = activeRoles.filter(ur => ur.role.organizationId === organizationId && ur.role.status === "ACTIVE");
    if (orgRoles.length === 0) return false;

    const roleIds = orgRoles.map(ur => ur.roleId);
    const rolePermissions = await this.permissionRepository.findRolePermissionsByRoleIds(roleIds);

    const userPermStrings = new Set(
      rolePermissions.map(rp => `${rp.permission.resource}:${rp.permission.action}`)
    );

    return permissions.every(p => userPermStrings.has(p));
  }

  async getRolePermissions(organizationId: string, roleId: string) {
    const role = await this.roleRepository.findById(roleId, organizationId);
    if (!role) {
      throw new RoleNotFoundError(roleId);
    }
    return this.permissionRepository.findRolePermissions(roleId);
  }

  async updateRolePermissions(organizationId: string, roleId: string, permissionIds: string[]) {
    const role = await this.roleRepository.findById(roleId, organizationId);
    if (!role) {
      throw new RoleNotFoundError(roleId);
    }

    const validatedPermissionIds = await this.permissionRepository.validatePermissionIds(permissionIds);
    if (validatedPermissionIds.length !== new Set(permissionIds).size) {
      throw new Error("One or more permission IDs are invalid.");
    }
    await this.permissionRepository.replaceRolePermissions(roleId, validatedPermissionIds);

    return this.getRolePermissions(organizationId, roleId);
  }

  async getPermissions() {
    return this.permissionRepository.findPermissions();
  }
}
