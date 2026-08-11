import { prisma } from "@/lib/prisma";
import { NotificationRepository } from "@/repositories/notification.repository";

/**
 * Server-only notification dispatcher for completed member-specific workflows.
 * It deliberately has no API route: recipients are supplied only by trusted services.
 */
export class SystemNotificationService {
  constructor(private readonly notificationRepository = new NotificationRepository()) {}

  async notifyMember(input: {
    organizationId: string;
    memberId: string;
    sourceType: "APPOINTMENT" | "CERTIFICATE";
    sourceId: string;
    eventType: "APPOINTMENT_CREATED" | "CERTIFICATE_ISSUED";
    title: string;
    message: string;
  }) {
    const member = await prisma.member.findFirst({
      where: { id: input.memberId, organizationId: input.organizationId },
    });
    if (!member || member.deletedAt || member.status !== "ACTIVE") return null;

    // Idempotency for retried service calls. Recipient creation is nested with the
    // notification, so no recipient can be persisted without its notification.
    const existing = await prisma.notification.findFirst({
      where: {
        organizationId: input.organizationId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        eventType: input.eventType,
      },
    });
    if (existing) return existing;

    return this.notificationRepository.create({
      organizationId: input.organizationId,
      title: input.title,
      message: input.message,
      type: "SYSTEM",
      targetScope: "MEMBERS",
      memberIds: [input.memberId],
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      eventType: input.eventType,
    });
  }
}
