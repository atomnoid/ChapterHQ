import { RoleRepository } from "@/repositories/role.repository";
import { UserRoleRepository } from "@/repositories/user-role.repository";
import { DEFAULT_ORG_ROLES, OWNER_ROLE_NAME } from "@/constants/roles";
import { buildPaginationParams, buildPaginatedResult, PaginationQuery } from "@/lib/pagination";
import { logActivity } from "@/lib/audit-logger";

export class RoleNotFoundError extends Error {
  constructor(nameOrId: string) {
    super(`Role "${nameOrId}" not found in this organization.`);
    this.name = "RoleNotFoundError";
  }
}

export class UserRoleAlreadyExistsError extends Error {
  constructor() {
    super("This role has already been assigned to the member.");
    this.name = "UserRoleAlreadyExistsError";
  }
}

export class DuplicateRoleNameError extends Error {
  constructor() {
    super("A role with this name already exists in this organization.");
    this.name = "DuplicateRoleNameError";
  }
}

export class ProtectedRoleModificationError extends Error {
  constructor(action: "rename" | "delete") {
    super(`The President role cannot be ${action}d.`);
    this.name = "ProtectedRoleModificationError";
  }
}

export class RoleService {
  constructor(
    private readonly roleRepository = new RoleRepository(),
    private readonly userRoleRepository = new UserRoleRepository()
  ) {}

  async seedDefaultRoles(organizationId: string) {
    await this.roleRepository.createMany(
      DEFAULT_ORG_ROLES.map((r) => ({
        organizationId,
        name: r.name,
        scope: r.scope,
      }))
    );
  }

  async assignOwnerRole(organizationId: string, memberId: string) {
    const ownerRole = await this.roleRepository.findByOrganizationAndName(
      organizationId,
      OWNER_ROLE_NAME
    );

    if (!ownerRole) {
      throw new RoleNotFoundError(OWNER_ROLE_NAME);
    }

    const existing = await this.userRoleRepository.findByMemberAndRole(
      memberId,
      ownerRole.id
    );

    if (existing) {
      throw new UserRoleAlreadyExistsError();
    }

    return this.userRoleRepository.create({
      memberId,
      roleId: ownerRole.id,
    });
  }

  async getRoles(params: PaginationQuery & { organizationId: string }) {
    const paginationParams = buildPaginationParams(params);
    const { total, items } = await this.roleRepository.listByOrganization({
      ...paginationParams,
      organizationId: params.organizationId,
    });

    return buildPaginatedResult(items, total, params);
  }

  async getRole(id: string, organizationId: string) {
    const role = await this.roleRepository.findById(id, organizationId);
    if (!role) {
      throw new RoleNotFoundError(id);
    }
    return role;
  }

  async createRole(organizationId: string, data: { name: string; description?: string; scope?: any }, actorUserId?: string) {
    const nameExists = await this.roleRepository.existsByName(organizationId, data.name);
    if (nameExists) {
      throw new DuplicateRoleNameError();
    }

    const role = await this.roleRepository.create({
      organizationId,
      name: data.name,
      scope: data.scope ?? "ORGANIZATION",
      ...data,
    });

    if (actorUserId) {
      await logActivity(
        { userId: actorUserId, organizationId },
        "create",
        "role",
        role.id,
        role.name
      );
    }

    return role;
  }

  async updateRole(id: string, organizationId: string, data: { name?: string; description?: string; scope?: any }, actorUserId?: string) {
    const role = await this.roleRepository.findById(id, organizationId);
    if (!role) {
      throw new RoleNotFoundError(id);
    }

    if (role.name === OWNER_ROLE_NAME) {
      if (data.name && data.name.toLowerCase() !== OWNER_ROLE_NAME.toLowerCase()) {
        throw new ProtectedRoleModificationError("rename");
      }
    }

    if (data.name) {
      const nameExists = await this.roleRepository.existsByName(organizationId, data.name, id);
      if (nameExists) {
        throw new DuplicateRoleNameError();
      }
    }

    const updated = await this.roleRepository.update(id, organizationId, data);

    if (actorUserId) {
      await logActivity(
        { userId: actorUserId, organizationId },
        "update",
        "role",
        id,
        updated.name,
        data
      );
    }

    return updated;
  }

  async deleteRole(id: string, organizationId: string, actorUserId?: string) {
    const role = await this.roleRepository.findById(id, organizationId);
    if (!role) {
      throw new RoleNotFoundError(id);
    }

    if (role.name === OWNER_ROLE_NAME) {
      throw new ProtectedRoleModificationError("delete");
    }

    const deleted = await this.roleRepository.softDelete(id, organizationId);

    if (actorUserId) {
      await logActivity(
        { userId: actorUserId, organizationId },
        "delete",
        "role",
        id,
        role.name
      );
    }

    return deleted;
  }

  async duplicateRole(id: string, organizationId: string, data: { name: string; description?: string }, actorUserId?: string) {
    const sourceRole = await this.roleRepository.findById(id, organizationId);
    if (!sourceRole) {
      throw new RoleNotFoundError(id);
    }

    const nameExists = await this.roleRepository.existsByName(organizationId, data.name);
    if (nameExists) {
      throw new DuplicateRoleNameError();
    }

    // 1. Create duplicate role
    const newRole = await this.roleRepository.create({
      organizationId,
      name: data.name,
      scope: sourceRole.scope,
      description: data.description ?? sourceRole.description ?? undefined,
    });

    // 2. Fetch original permission mappings
    const { PermissionRepository } = require("@/repositories/permission.repository");
    const permissionRepo = new PermissionRepository();
    const sourcePermissions = await permissionRepo.findRolePermissions(id);

    // 3. Duplicate permission mappings
    if (sourcePermissions.length > 0) {
      await permissionRepo.createRolePermissions(
        sourcePermissions.map((rp: any) => ({
          roleId: newRole.id,
          permissionId: rp.permissionId,
        }))
      );
    }

    if (actorUserId) {
      await logActivity(
        { userId: actorUserId, organizationId },
        "create",
        "role",
        newRole.id,
        newRole.name,
        { duplicatedFrom: id }
      );
    }

    return newRole;
  }
}
