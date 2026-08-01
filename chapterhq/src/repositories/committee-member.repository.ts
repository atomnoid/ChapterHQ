import { prisma } from "@/lib/prisma";
import { buildOrderBy, PaginationParams } from "@/lib/pagination";

export class CommitteeMemberRepository {
  /**
   * Find an active (non-soft-deleted) assignment for a given committee + member pair.
   */
  async findAssignment(committeeId: string, memberId: string) {
    return prisma.committeeMember.findFirst({
      where: {
        committeeId,
        memberId,
        deletedAt: null,
      },
    });
  }

  /**
   * Create a new committee–member assignment.
   * Handles the case where a soft-deleted record already exists by restoring it.
   */
  async assign(committeeId: string, memberId: string) {
    // Restore a previously soft-deleted record if present
    const existing = await prisma.committeeMember.findFirst({
      where: { committeeId, memberId },
    });

    if (existing) {
      return prisma.committeeMember.update({
        where: { id: existing.id },
        data: { deletedAt: null, assignedAt: new Date() },
      });
    }

    return prisma.committeeMember.create({
      data: { committeeId, memberId },
    });
  }

  /**
   * Soft-delete a committee–member assignment.
   */
  async remove(committeeId: string, memberId: string) {
    return prisma.committeeMember.updateMany({
      where: {
        committeeId,
        memberId,
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * List active members of a committee (with user info).
   */
  async listByCommittee(
    committeeId: string,
    params: PaginationParams
  ) {
    const whereClause: any = {
      committeeId,
      deletedAt: null,
      member: { deletedAt: null },
    };

    if (params.search) {
      whereClause.member = {
        ...whereClause.member,
        user: {
          OR: [
            { name: { contains: params.search, mode: "insensitive" } },
            { email: { contains: params.search, mode: "insensitive" } },
          ],
        },
      };
    }

    const orderBy = buildOrderBy(params.sortBy, params.order, "assignedAt");

    const [total, items] = await Promise.all([
      prisma.committeeMember.count({ where: whereClause }),
      prisma.committeeMember.findMany({
        where: whereClause,
        skip: params.skip,
        take: params.take,
        orderBy,
        include: {
          member: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return { total, items };
  }

  /**
   * List all committees a member belongs to (active assignments only).
   */
  async listByMember(memberId: string, organizationId: string) {
    return prisma.committeeMember.findMany({
      where: {
        memberId,
        deletedAt: null,
        committee: {
          organizationId,
          deletedAt: null,
        },
      },
      include: {
        committee: true,
      },
      orderBy: { assignedAt: "desc" },
    });
  }
}
