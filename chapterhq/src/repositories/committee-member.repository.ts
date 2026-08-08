import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { buildOrderBy, PaginationParams } from "@/lib/pagination";

export class CommitteeMemberRepository {
  /**
   * Find an active (non-soft-deleted) assignment for a given committee + member pair.
   */
  async findAssignment(committeeId: string, memberId: string) {
    // MongoDB Prisma bug: deletedAt: null in where clause returns no results.
    const assignment = await prisma.committeeMember.findFirst({
      where: {
        committeeId,
        memberId,
      },
    });
    if (assignment?.deletedAt) return null;
    return assignment;
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
    // MongoDB Prisma bug: deletedAt: null in where clause returns no results.
    // Removing the filter is safe since updating already-deleted records is idempotent.
    return prisma.committeeMember.updateMany({
      where: {
        committeeId,
        memberId,
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
    // MongoDB Prisma bug: deletedAt: null and nested relation deletedAt filters return no results.
    const whereClause: Prisma.CommitteeMemberWhereInput = {
      committeeId,
    };

    if (params.search) {
      whereClause.member = {
        user: {
          OR: [
            { name: { contains: params.search, mode: "insensitive" } },
            { email: { contains: params.search, mode: "insensitive" } },
          ],
        },
      };
    }

    const orderBy = buildOrderBy(params.sortBy, params.order, "assignedAt");

    const allItems = await prisma.committeeMember.findMany({
      where: whereClause,
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
    });

    const notDeleted = allItems.filter((cm) => !cm.deletedAt && !cm.member.deletedAt);
    const total = notDeleted.length;
    const items = notDeleted.slice(params.skip, params.skip + params.take);

    return { total, items };
  }

  /**
   * List all committees a member belongs to (active assignments only).
   */
  async listByMember(memberId: string, organizationId: string) {
    // MongoDB Prisma bug: deletedAt: null and nested relation deletedAt filters return no results.
    const allAssignments = await prisma.committeeMember.findMany({
      where: {
        memberId,
        committee: {
          organizationId,
        },
      },
      include: {
        committee: true,
      },
      orderBy: { assignedAt: "desc" },
    });

    return allAssignments.filter((cm) => !cm.deletedAt && !cm.committee.deletedAt);
  }
}
