import { RoleRepository } from "@/repositories/role.repository";
import { UserRoleRepository } from "@/repositories/user-role.repository";
import { DEFAULT_ORG_ROLES, OWNER_ROLE_NAME } from "@/constants/roles";
import { buildPaginationParams, buildPaginatedResult, PaginationQuery } from "@/lib/pagination";
import { logActivity } from "@/lib/audit-logger";
import { PermissionRepository } from "@/repositories/permission.repository";
import { RoleScope } from "@prisma/client";

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

  async assignRoleByName(organizationId: string, memberId: string, roleName: string) {
    const role = await this.roleRepository.findByOrganizationAndName(organizationId, roleName);

    if (!role) {
      throw new RoleNotFoundError(roleName);
    }

    const existing = await this.userRoleRepository.findByMemberAndRole(memberId, role.id);

    if (existing) {
      throw new UserRoleAlreadyExistsError();
    }

    return this.userRoleRepository.create({
      memberId,
      roleId: role.id,
    });
  }

  async assignOwnerRole(organizationId: string, memberId: string) {
    return this.assignRoleByName(organizationId, memberId, OWNER_ROLE_NAME);
  }

  async assignMemberRole(organizationId: string, memberId: string) {
    return this.assignRoleByName(organizationId, memberId, "Member");
  }

  async getRoles(params: PaginationQuery & { organizationId: string; activeCommitteeId?: string | null }) {
    const paginationParams = buildPaginationParams(params);
    const { total, items } = await this.roleRepository.listByOrganization({
      ...paginationParams,
      organizationId: params.organizationId,
    });

    const activeCommitteeId = params.activeCommitteeId;
    const filteredRoles = items
      .filter((role) => {
        if (!role.name.startsWith("[committeeId:")) return true;
        if (activeCommitteeId && role.name.startsWith(`[committeeId:${activeCommitteeId}]`)) return true;
        return false;
      })
      .map((role) => {
        if (role.name.startsWith("[committeeId:")) {
          const cleanName = role.name.replace(/^\[committeeId:[^\]]+\]\s*/, "");
          return { ...role, name: cleanName };
        }
        return role;
      });

    return buildPaginatedResult(filteredRoles, total, params);
  }

  async getRole(id: string, organizationId: string) {
    const role = await this.roleRepository.findById(id, organizationId);
    if (!role) {
      throw new RoleNotFoundError(id);
    }
    if (role.name.startsWith("[committeeId:")) {
      const cleanName = role.name.replace(/^\[committeeId:[^\]]+\]\s*/, "");
      return { ...role, name: cleanName };
    }
    return role;
  }

  async createRole(organizationId: string, data: { name: string; description?: string; scope?: RoleScope }, actorUserId?: string, activeCommitteeId?: string | null) {
    const prefixedName = activeCommitteeId ? `[committeeId:${activeCommitteeId}] ${data.name}` : data.name;
    const scope = activeCommitteeId ? "COMMITTEE" : (data.scope ?? "ORGANIZATION");
    const activeRole = await this.roleRepository.findActiveByOrganizationAndName(organizationId, prefixedName);
    if (activeRole) {
      throw new DuplicateRoleNameError();
    }

    const softDeletedRole = await this.roleRepository.findSoftDeletedByOrganizationAndName(organizationId, prefixedName);
    const role = softDeletedRole
      ? await this.roleRepository.restore(softDeletedRole.id, organizationId, {
          scope,
          description: data.description ?? softDeletedRole.description ?? undefined,
        })
      : await this.roleRepository.create({
          organizationId,
          name: prefixedName,
          scope,
          description: data.description,
        });

    const cleanName = role.name.replace(/^\[committeeId:[^\]]+\]\s*/, "");

    if (actorUserId) {
      await logActivity(
        { userId: actorUserId, organizationId },
        softDeletedRole ? "restore" : "create",
        "role",
        role.id,
        cleanName
      );
    }

    return { ...role, name: cleanName };
  }

  async updateRole(id: string, organizationId: string, data: { name?: string; description?: string; scope?: RoleScope }, actorUserId?: string) {
    const role = await this.roleRepository.findById(id, organizationId);
    if (!role) {
      throw new RoleNotFoundError(id);
    }

    if (role.name === OWNER_ROLE_NAME || role.name === "President") {
      if (data.name && data.name.toLowerCase() !== OWNER_ROLE_NAME.toLowerCase() && data.name.toLowerCase() !== "president") {
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

    if (role.name === OWNER_ROLE_NAME || role.name === "President") {
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
    const permissionRepo = new PermissionRepository();
    const sourcePermissions = await permissionRepo.findRolePermissions(id);

    // 3. Duplicate permission mappings
    if (sourcePermissions.length > 0) {
      await permissionRepo.createRolePermissions(
        sourcePermissions.map((rp) => ({
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
