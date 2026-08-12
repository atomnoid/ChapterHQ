import { prisma } from "@/lib/prisma";
import { buildOrderBy, PaginationParams } from "@/lib/pagination";
import { Prisma } from "@prisma/client";

export interface CreateNotificationData {
  organizationId: string;
  title: string;
  message: string;
  type: string;
  targetScope: string;
  targetCommitteeId?: string | null;
  memberIds?: string[];
  sourceType?: string;
  sourceId?: string;
  eventType?: string;
}

export class NotificationRepository {
  async create(data: CreateNotificationData) {
    return prisma.notification.create({
      data: {
        organizationId: data.organizationId,
        title: data.title,
        message: data.message,
        type: data.type,
        targetScope: data.targetScope,
        targetCommitteeId: data.targetCommitteeId,
        isRead: false,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        eventType: data.eventType,
        recipients: data.memberIds?.length ? { create: data.memberIds.map((memberId) => ({ memberId })) } : undefined,
      },
    });
  }

  async findById(id: string, organizationId: string) {
    return prisma.notification.findFirst({
      where: {
        id,
        organizationId,
      },
    });
  }

  async markAsRead(id: string, organizationId: string) {
    return prisma.notification.update({
      where: {
        id,
        organizationId,
      },
      data: {
        isRead: true,
      },
    });
  }

  async markAllAsRead(organizationId: string, committeeId?: string | null) {
    const where: Prisma.NotificationWhereInput = { organizationId, isRead: false };

    if (committeeId) {
      where.OR = [
        { targetCommitteeId: committeeId },
        { targetCommitteeId: null },
      ];
    }

    return prisma.notification.updateMany({
      where,
      data: { isRead: true },
    });
  }

  async delete(id: string, organizationId: string) {
    return prisma.notification.delete({
      where: {
        id,
        organizationId,
      },
    });
  }

  async unreadCount(organizationId: string, committeeId?: string | null): Promise<number> {
    const andClauses: Prisma.NotificationWhereInput[] = [
      { organizationId },
      { isRead: false },
    ];

    if (committeeId) {
      andClauses.push({
        OR: [
          { targetCommitteeId: committeeId },
          { targetCommitteeId: null },
        ],
      });
    }

    return prisma.notification.count({ where: { AND: andClauses } });
  }

  async list(params: PaginationParams & { organizationId: string; memberId?: string; isRead?: boolean; type?: string; targetScope?: string; committeeId?: string | null }) {
    const andClauses: Prisma.NotificationWhereInput[] = [
      { organizationId: params.organizationId }
    ];

    if (params.isRead !== undefined) {
      andClauses.push({ isRead: params.isRead });
    }

    if (params.type) {
      andClauses.push({ type: params.type });
    }

    if (params.targetScope) {
      andClauses.push({ targetScope: params.targetScope });
    }

    // Notifications are delivered through recipient records. This prevents a
    // member-specific system notification from appearing for another member.
    if (params.memberId) {
      andClauses.push({ recipients: { some: { memberId: params.memberId } } });
    }

    if (params.committeeId !== undefined && params.committeeId !== null) {
      andClauses.push({
        OR: [
          { targetCommitteeId: params.committeeId },
          { targetCommitteeId: null }
        ]
      });
    }

    if (params.search) {
      andClauses.push({
        OR: [
          { title: { contains: params.search, mode: "insensitive" } },
          { message: { contains: params.search, mode: "insensitive" } },
        ]
      });
    }

    const whereClause = { AND: andClauses };
    const orderBy = buildOrderBy(params.sortBy, params.order, "createdAt");

    const [total, items] = await Promise.all([
      prisma.notification.count({ where: whereClause }),
      prisma.notification.findMany({
        where: whereClause,
        skip: params.skip,
        take: params.take,
        orderBy,
      }),
    ]);

    return { total, items };
  }
}
