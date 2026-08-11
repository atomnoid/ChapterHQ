import { NotificationRepository } from "@/repositories/notification.repository";
import { buildPaginationParams, buildPaginatedResult, PaginationQuery } from "@/lib/pagination";
import { PermissionDeniedError } from "@/types/errors";
import { prisma } from "@/lib/prisma";

export class NotificationNotFoundError extends Error {
  constructor() {
    super("Notification not found.");
    this.name = "NotificationNotFoundError";
  }
}

export class NotificationService {
  constructor(
    private readonly repository = new NotificationRepository()
  ) {}

  async createNotification(
    organizationId: string,
    data: {
      title: string;
      message: string;
      type: string;
      targetScope: string;
      targetCommitteeId?: string | null;
    }
  ) {
    if (data.targetCommitteeId) {
      // Verify committee belongs to organization and is not deleted
      const committee = await prisma.committee.findFirst({
        where: { id: data.targetCommitteeId, organizationId, deletedAt: null },
      });
      if (!committee) {
        throw new PermissionDeniedError();
      }
    }

    return this.repository.create({
      organizationId,
      ...data,
    });
  }

  async getNotifications(
    organizationId: string,
    params: PaginationQuery & { isRead?: boolean; type?: string; targetScope?: string },
    activeCommitteeId?: string | null
  ) {
    const paginationParams = buildPaginationParams(params);
    const { total, items } = await this.repository.list({
      ...paginationParams,
      organizationId,
      isRead: params.isRead,
      type: params.type,
      targetScope: params.targetScope,
      committeeId: activeCommitteeId,
    });

    return buildPaginatedResult(items, total, params);
  }

  async getNotification(id: string, organizationId: string, activeCommitteeId?: string | null) {
    const notification = await this.repository.findById(id, organizationId);
    if (!notification) {
      throw new NotificationNotFoundError();
    }

    if (activeCommitteeId && notification.targetCommitteeId !== null && notification.targetCommitteeId !== activeCommitteeId) {
      throw new NotificationNotFoundError();
    }

    return notification;
  }

  async markAsRead(id: string, organizationId: string, activeCommitteeId?: string | null) {
    const notification = await this.repository.findById(id, organizationId);
    if (!notification) {
      throw new NotificationNotFoundError();
    }

    if (activeCommitteeId && notification.targetCommitteeId !== null && notification.targetCommitteeId !== activeCommitteeId) {
      throw new NotificationNotFoundError();
    }

    return this.repository.markAsRead(id, organizationId);
  }

  async markAllAsRead(organizationId: string, activeCommitteeId?: string | null) {
    return this.repository.markAllAsRead(organizationId, activeCommitteeId);
  }

  async deleteNotification(id: string, organizationId: string, activeCommitteeId?: string | null) {
    const notification = await this.repository.findById(id, organizationId);
    if (!notification) {
      throw new NotificationNotFoundError();
    }

    if (activeCommitteeId && notification.targetCommitteeId !== null && notification.targetCommitteeId !== activeCommitteeId) {
      throw new NotificationNotFoundError();
    }

    return this.repository.delete(id, organizationId);
  }

  async getUnreadCount(organizationId: string, activeCommitteeId?: string | null): Promise<number> {
    return this.repository.unreadCount(organizationId, activeCommitteeId);
  }
}
