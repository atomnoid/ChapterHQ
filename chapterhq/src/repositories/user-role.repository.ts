import { prisma } from "@/lib/prisma";

interface CreateUserRoleData {
  memberId: string;
  roleId: string;
}

export class UserRoleRepository {
  async create(data: CreateUserRoleData) {
    return prisma.userRole.create({
      data: {
        memberId: data.memberId,
        roleId: data.roleId,
      },
    });
  }

  async findByMemberAndRole(memberId: string, roleId: string) {
    return prisma.userRole.findFirst({
      where: {
        memberId,
        roleId,
      },
    });
  }

  /**
   * Get all active role assignments for a member.
   *
   * Post-filters to exclude:
   * - Roles that have been soft-deleted (deletedAt is not null)
   * - Inactive roles
   *
   * This is necessary due to MongoDB Prisma limitation with nested relation filters.
   */
  async findUserRoles(memberId: string) {
    // MongoDB Prisma bug: nested relation filter { role: { deletedAt: null } } returns no results.
    const userRoles = await prisma.userRole.findMany({
      where: { memberId },
      include: { role: true },
    });
    // Post-filter: exclude assignments where the role has been soft-deleted or is inactive.
    return userRoles.filter((ur) => !ur.role.deletedAt && ur.role.status === "ACTIVE");
  }

  /**
   * Get all members with a specific role assignment.
   * Includes member and user details.
   */
  async findMembersWithRole(roleId: string) {
    return prisma.userRole.findMany({
      where: { roleId },
      include: {
        member: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  /**
   * Count active role assignments for a member.
   */
  async countMemberRoles(memberId: string): Promise<number> {
    const userRoles = await this.findUserRoles(memberId);
    return userRoles.length;
  }

  /**
   * Delete a specific role assignment.
   * Uses MongoDB compound unique key: memberId_roleId
   */
  async delete(memberId: string, roleId: string) {
    return prisma.userRole.delete({
      where: {
        memberId_roleId: {
          memberId,
          roleId,
        },
      },
    });
  }
}
