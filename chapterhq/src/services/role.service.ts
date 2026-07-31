import { RoleRepository } from "@/repositories/role.repository";
import { UserRoleRepository } from "@/repositories/user-role.repository";
import { DEFAULT_ORG_ROLES, OWNER_ROLE_NAME } from "@/constants/roles";

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

  async getRoles(params: {
    organizationId: string;
    search?: string;
    page: number;
    limit: number;
  }) {
    const skip = (params.page - 1) * params.limit;
    const { total, items } = await this.roleRepository.listByOrganization({
      organizationId: params.organizationId,
      search: params.search,
      skip,
      take: params.limit,
    });

    return {
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(total / params.limit),
      items,
    };
  }

  async getRole(id: string, organizationId: string) {
    const role = await this.roleRepository.findById(id, organizationId);
    if (!role) {
      throw new RoleNotFoundError(id);
    }
    return role;
  }

  async createRole(organizationId: string, data: { name: string; description?: string; scope?: any }) {
    const nameExists = await this.roleRepository.existsByName(organizationId, data.name);
    if (nameExists) {
      throw new DuplicateRoleNameError();
    }

    return this.roleRepository.create({
      organizationId,
      name: data.name,
      scope: data.scope ?? "ORGANIZATION",
      ...data,
    });
  }

  async updateRole(id: string, organizationId: string, data: { name?: string; description?: string; scope?: any }) {
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

    return this.roleRepository.update(id, organizationId, data);
  }

  async deleteRole(id: string, organizationId: string) {
    const role = await this.roleRepository.findById(id, organizationId);
    if (!role) {
      throw new RoleNotFoundError(id);
    }

    if (role.name === OWNER_ROLE_NAME) {
      throw new ProtectedRoleModificationError("delete");
    }

    return this.roleRepository.softDelete(id, organizationId);
  }
}
