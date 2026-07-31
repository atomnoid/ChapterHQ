import { UserRoleRepository } from "@/repositories/user-role.repository";
import { MemberRepository } from "@/repositories/member.repository";
import { RoleRepository } from "@/repositories/role.repository";
import { MemberNotFoundError } from "@/services/member.service";
import { RoleNotFoundError, UserRoleAlreadyExistsError } from "@/services/role.service";

export class UserRoleNotFoundError extends Error {
  constructor() {
    super("Assigned role not found for this member.");
    this.name = "UserRoleNotFoundError";
  }
}

export class InactiveRoleAssignmentError extends Error {
  constructor() {
    super("Cannot assign an inactive role.");
    this.name = "InactiveRoleAssignmentError";
  }
}

export class UserRoleService {
  constructor(
    private readonly userRoleRepository = new UserRoleRepository(),
    private readonly memberRepository = new MemberRepository(),
    private readonly roleRepository = new RoleRepository()
  ) {}

  async assignRole(organizationId: string, memberId: string, roleId: string) {
    const member = await this.memberRepository.findByIdAndOrganization(memberId, organizationId);
    if (!member) {
      throw new MemberNotFoundError();
    }

    const role = await this.roleRepository.findById(roleId, organizationId);
    if (!role) {
      throw new RoleNotFoundError(roleId);
    }

    if (role.status !== "ACTIVE") {
      throw new InactiveRoleAssignmentError();
    }

    const existing = await this.userRoleRepository.findByMemberAndRole(memberId, roleId);
    if (existing) {
      throw new UserRoleAlreadyExistsError();
    }

    return this.userRoleRepository.create({ memberId, roleId });
  }

  async removeRole(organizationId: string, memberId: string, roleId: string) {
    const member = await this.memberRepository.findByIdAndOrganization(memberId, organizationId);
    if (!member) {
      throw new MemberNotFoundError();
    }

    const existing = await this.userRoleRepository.findByMemberAndRole(memberId, roleId);
    if (!existing) {
      throw new UserRoleNotFoundError();
    }

    return this.userRoleRepository.delete(memberId, roleId);
  }

  async getMemberRoles(organizationId: string, memberId: string) {
    const member = await this.memberRepository.findByIdAndOrganization(memberId, organizationId);
    if (!member) {
      throw new MemberNotFoundError();
    }

    const userRoles = await this.userRoleRepository.findUserRoles(memberId);
    return userRoles.map(ur => ur.role);
  }
}
