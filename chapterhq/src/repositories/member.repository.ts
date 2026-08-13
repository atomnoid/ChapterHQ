import { prisma } from "@/lib/prisma";
import { buildOrderBy, PaginationParams } from "@/lib/pagination";
import { MemberStatus, Prisma } from "@prisma/client";

interface CreateMemberData {
  organizationId: string;
  userId: string;
}

export class MemberRepository {
  async create(data: CreateMemberData) {
    return prisma.member.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
      },
    });
  }

  async findByOrganizationAndUser(organizationId: string, userId: string) {
    // MongoDB Prisma bug: deletedAt: null in where clause returns no results.
    // Remove from query; post-check in JS instead.
    const member = await prisma.member.findFirst({
      where: {
        organizationId,
        userId,
      },
    });
    if (member?.deletedAt) return null;
    return member;
  }

  async findAnyByOrganizationAndUser(organizationId: string, userId: string) {
    return prisma.member.findFirst({
      where: {
        organizationId,
        userId,
      },
    });
  }

  async findActiveByUserId(userId: string, activeOrganizationId?: string) {
    const whereClause: Prisma.MemberWhereInput = {
      userId,
      status: "ACTIVE",
    };

    if (activeOrganizationId) {
      whereClause.organizationId = activeOrganizationId;
    }

    // MongoDB Prisma bug: deletedAt: null in where clause returns no results.
    // Fetch without filter and post-filter in JS.
    const members = await prisma.member.findMany({
      where: whereClause,
      include: {
        organization: true,
      },
    });

    const filtered = members.filter((m) => !m.deletedAt);

    console.log(
      "[MemberRepo] findActiveByUserId:",
      JSON.stringify(filtered, null, 2)
    );

    return filtered[0] ?? null;
  }

  async findByIdAndOrganization(id: string, organizationId: string) {
    // MongoDB Prisma bug: deletedAt: null in where clause returns no results.
    // Remove from query; post-check in JS instead.
    const member = await prisma.member.findFirst({
      where: {
        id,
        organizationId,
      },
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
    });
    if (member?.deletedAt) return null;
    return member;
  }

  async list(
    params: PaginationParams & { organizationId: string; status?: MemberStatus; activeCommitteeId?: string | null },
  ) {
    const whereClause: Prisma.MemberWhereInput = {
      organizationId: params.organizationId,
      // MongoDB Prisma bug: deletedAt: null removed; JS post-filter applied below.
    };

    if (params.activeCommitteeId) {
      const assignments = await prisma.committeeMember.findMany({
        where: { committeeId: params.activeCommitteeId },
        select: { memberId: true, deletedAt: true },
      });
      const activeMemberIds = assignments
        .filter((a) => !a.deletedAt)
        .map((a) => a.memberId);
      whereClause.id = { in: activeMemberIds };
    }

    if (params.status) {
      whereClause.status = params.status;
    }

    if (params.search) {
      whereClause.user = {
        OR: [
          { name: { contains: params.search, mode: "insensitive" } },
          { email: { contains: params.search, mode: "insensitive" } },
        ],
      };
    }

    const orderBy = buildOrderBy(params.sortBy, params.order, "joinedAt");

    const allItems = await prisma.member.findMany({
      where: whereClause,
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
      orderBy,
    });

    // Post-filter soft-deleted records in JS (MongoDB Prisma bug workaround).
    const notDeleted = allItems.filter((m) => !m.deletedAt);
    const total = notDeleted.length;
    const items = notDeleted.slice(params.skip, params.skip + params.take);

    return { total, items };
  }

  async update(id: string, organizationId: string, data: { status?: MemberStatus }) {
    return prisma.member.update({
      where: {
        id,
        organizationId,
      },
      data,
    });
  }

  async delete(id: string, organizationId: string) {
    return prisma.member.update({
      where: {
        id,
        organizationId,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async listByUser(userId: string) {
    // MongoDB Prisma bug: deletedAt: null in where clause returns no results.
    // Fetch without deletedAt filter and post-filter in JS.
    const members = await prisma.member.findMany({
      where: {
        userId,
        status: "ACTIVE",
      },
      include: {
        organization: true,
      },
    });

    const final = members.filter((m) => !m.deletedAt);

    console.log("[MemberRepo] listByUser:", JSON.stringify(final, null, 2));

    return final;
  }
}
