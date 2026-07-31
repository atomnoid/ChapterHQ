import { RoleRepository } from "@/repositories/role.repository";
import { UserRoleRepository } from "@/repositories/user-role.repository";
import { DEFAULT_ORG_ROLES, OWNER_ROLE_NAME } from "@/constants/roles";

export class RoleNotFoundError extends Error {
  constructor(name: string) {
    super(`Role "${name}" not found in this organization.`);
    this.name = "RoleNotFoundError";
  }
}

export class UserRoleAlreadyExistsError extends Error {
  constructor() {
    super("This role has already been assigned to the member.");
    this.name = "UserRoleAlreadyExistsError";
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
}
