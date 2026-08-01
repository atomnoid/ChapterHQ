import { NotificationRepository } from "@/repositories/notification.repository";
import { buildPaginationParams, buildPaginatedResult, PaginationQuery } from "@/lib/pagination";

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
    }
  ) {
    return this.repository.create({
      organizationId,
      ...data,
    });
  }

  async getNotifications(
    organizationId: string,
    params: PaginationQuery & { isRead?: boolean; type?: string; targetScope?: string }
  ) {
    const paginationParams = buildPaginationParams(params);
    const { total, items } = await this.repository.list({
      ...paginationParams,
      organizationId,
      isRead: params.isRead,
      type: params.type,
      targetScope: params.targetScope,
    });

    return buildPaginatedResult(items, total, params);
  }

  async getNotification(id: string, organizationId: string) {
    const notification = await this.repository.findById(id, organizationId);
    if (!notification) {
      throw new NotificationNotFoundError();
    }
    return notification;
  }

  async markAsRead(id: string, organizationId: string) {
    const notification = await this.repository.findById(id, organizationId);
    if (!notification) {
      throw new NotificationNotFoundError();
    }
    return this.repository.markAsRead(id, organizationId);
  }
}
