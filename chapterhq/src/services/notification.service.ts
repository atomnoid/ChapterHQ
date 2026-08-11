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
      memberIds?: string[];
      recipientMode?: "ALL" | "SPECIFIC_MEMBERS";
    },
    actor: { activeCommitteeId?: string | null; isOrganizationAdministrator: boolean }
  ) {
    const isCommitteeScopedActor = !actor.isOrganizationAdministrator;
    if (isCommitteeScopedActor && !actor.activeCommitteeId) throw new PermissionDeniedError();
    if (isCommitteeScopedActor && data.targetScope === "ORGANIZATION") throw new PermissionDeniedError();

    const targetCommitteeId = data.targetScope === "COMMITTEE"
      ? (isCommitteeScopedActor ? actor.activeCommitteeId! : data.targetCommitteeId)
      : null;

    if (data.targetScope === "COMMITTEE" && isCommitteeScopedActor && data.targetCommitteeId && data.targetCommitteeId !== actor.activeCommitteeId) {
      throw new PermissionDeniedError();
    }

    if (targetCommitteeId) {
      // Verify committee belongs to organization and is not deleted
      const committee = await prisma.committee.findFirst({
        where: { id: targetCommitteeId, organizationId },
      });
      if (!committee || committee.deletedAt) {
        throw new PermissionDeniedError();
      }
    }

    let memberIds = [...new Set(data.memberIds ?? [])];
    if (data.targetScope === "COMMITTEE" && data.recipientMode === "SPECIFIC_MEMBERS") {
      const members = await prisma.member.findMany({ where: { id: { in: memberIds }, organizationId } });
      if (members.length !== memberIds.length || members.some((member) => member.status !== "ACTIVE" || member.deletedAt)) {
        throw new PermissionDeniedError();
      }
      if (isCommitteeScopedActor) {
        const assignments = await prisma.committeeMember.findMany({ where: { committeeId: actor.activeCommitteeId!, memberId: { in: memberIds } } });
        const activeMemberIds = new Set(assignments.filter((assignment) => !assignment.deletedAt).map((assignment) => assignment.memberId));
        if (activeMemberIds.size !== memberIds.length) throw new PermissionDeniedError();
      }
    }

    // Resolve recipients only after the audience has passed authorization. This keeps
    // every NotificationRecipient within the actor's trusted organization/committee scope.
    if (data.targetScope === "ORGANIZATION") {
      const members = await prisma.member.findMany({ where: { organizationId } });
      memberIds = members.filter((member) => member.status === "ACTIVE" && !member.deletedAt).map((member) => member.id);
    } else if (data.targetScope === "COMMITTEE") {
      const assignments = await prisma.committeeMember.findMany({ where: { committeeId: targetCommitteeId! } });
      const assignedIds = assignments.filter((assignment) => !assignment.deletedAt).map((assignment) => assignment.memberId);
      const members = await prisma.member.findMany({ where: { id: { in: assignedIds }, organizationId } });
      memberIds = members.filter((member) => member.status === "ACTIVE" && !member.deletedAt).map((member) => member.id);
    }

    return this.repository.create({
      organizationId,
      ...data,
      targetCommitteeId,
      memberIds,
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
