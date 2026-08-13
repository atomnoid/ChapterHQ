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

export class MultiTenancyViolationError extends Error {
  constructor() {
    super("Member and role must belong to the same organization.");
    this.name = "MultiTenancyViolationError";
  }
}

export class UserRoleService {
  constructor(
    private readonly userRoleRepository = new UserRoleRepository(),
    private readonly memberRepository = new MemberRepository(),
    private readonly roleRepository = new RoleRepository()
  ) {}

  /**
   * Assign a role to a member with full validation including multi-tenancy.
   *
   * Validates:
   * - Member exists in the organization
   * - Role exists in the organization
   * - Member and role belong to the SAME organization
   * - Role is active
   * - Role is not already assigned to this member
   */
  async assignRole(organizationId: string, memberId: string, roleId: string) {
    // 1. Verify member exists and belongs to this organization
    const member = await this.memberRepository.findByIdAndOrganization(memberId, organizationId);
    if (!member) {
      throw new MemberNotFoundError();
    }

    // 2. Verify role exists and belongs to this organization
    const role = await this.roleRepository.findById(roleId, organizationId);
    if (!role) {
      throw new RoleNotFoundError(roleId);
    }

    // 3. CRITICAL: Multi-tenancy validation
    // Even though both queries scoped to organizationId, verify the relationship
    if (member.organizationId !== organizationId || role.organizationId !== organizationId) {
      throw new MultiTenancyViolationError();
    }

    // 4. Verify role is active
    if (role.status !== "ACTIVE") {
      throw new InactiveRoleAssignmentError();
    }

    // 5. Verify this role is not already assigned to the member
    const existing = await this.userRoleRepository.findByMemberAndRole(memberId, roleId);
    if (existing) {
      throw new UserRoleAlreadyExistsError();
    }

    // 6. Create the assignment
    return this.userRoleRepository.create({ memberId, roleId });
  }

  /**
   * Remove a role assignment from a member.
   *
   * Validates:
   * - Member exists in the organization
   * - Assignment exists
   * - Does NOT delete the member or role, only the assignment
   */
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

  /**
   * Get all active roles assigned to a member.
   *
   * Filters out:
   * - Soft-deleted roles (deletedAt is not null)
   * - Inactive roles
   *
   * Returns role objects with full details.
   */
  async getMemberRoles(organizationId: string, memberId: string) {
    const member = await this.memberRepository.findByIdAndOrganization(memberId, organizationId);
    if (!member) {
      throw new MemberNotFoundError();
    }

    const userRoles = await this.userRoleRepository.findUserRoles(memberId);
    return userRoles.map(ur => ur.role);
  }

  /**
   * Get all available active roles for a member's organization
   * that can be assigned (excluding already assigned roles).
   */
  async getAvailableRoles(organizationId: string, memberId: string) {
    // Get the member to verify they exist
    const member = await this.memberRepository.findByIdAndOrganization(memberId, organizationId);
    if (!member) {
      throw new MemberNotFoundError();
    }

    // Get all active roles in the organization
    const allRoles = await this.roleRepository.findManyByOrganization(organizationId);

    // Get already assigned roles
    const assignedRoles = await this.userRoleRepository.findUserRoles(memberId);
    const assignedRoleIds = new Set(assignedRoles.map(ur => ur.roleId));

    // Return roles that are not yet assigned
    return allRoles.filter(role => !assignedRoleIds.has(role.id));
  }

  /**
   * Get all members assigned to a specific role.
   */
  async getRoleMembers(organizationId: string, roleId: string) {
    const role = await this.roleRepository.findById(roleId, organizationId);
    if (!role) {
      throw new RoleNotFoundError(roleId);
    }

    return this.userRoleRepository.findMembersWithRole(roleId);
  }

  /**
   * Count active roles assigned to a member (for dashboard display).
   */
  async countMemberRoles(organizationId: string, memberId: string): Promise<number> {
    const member = await this.memberRepository.findByIdAndOrganization(memberId, organizationId);
    if (!member) {
      throw new MemberNotFoundError();
    }

    const roles = await this.getMemberRoles(organizationId, memberId);
    return roles.length;
  }
}
