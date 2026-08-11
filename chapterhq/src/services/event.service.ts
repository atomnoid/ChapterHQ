import { EventRepository } from "@/repositories/event.repository";
import { buildPaginationParams, buildPaginatedResult, PaginationQuery } from "@/lib/pagination";
import { logActivity } from "@/lib/audit-logger";
import { EventStatus } from "@prisma/client";
import { PermissionDeniedError } from "@/types/errors";
import { prisma } from "@/lib/prisma";

// ─── Domain Errors ────────────────────────────────────────────────────────────

export class EventNotFoundError extends Error {
  constructor() {
    super("Event not found.");
    this.name = "EventNotFoundError";
  }
}

// ─── Input Types ─────────────────────────────────────────────────────────────

interface CreateEventInput {
  title: string;
  description?: string;
  venue?: string;
  startDate: Date;
  endDate?: Date;
  capacity?: number;
  registrationRequired?: boolean;
  status?: EventStatus;
  committeeId?: string | null;
}

interface UpdateEventInput {
  title?: string;
  description?: string;
  venue?: string;
  startDate?: Date;
  endDate?: Date;
  capacity?: number;
  registrationRequired?: boolean;
  status?: EventStatus;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class EventService {
  constructor(
    private readonly repository = new EventRepository()
  ) {}

  async createEvent(
    organizationId: string,
    data: CreateEventInput,
    actorUserId?: string
  ) {
    if (data.committeeId) {
      // 1. Verify committee belongs to organization and is not deleted
      const committee = await prisma.committee.findFirst({
        where: { id: data.committeeId, organizationId },
      });
      if (!committee || committee.deletedAt) {
        throw new PermissionDeniedError();
      }

      // 2. Check if user has access to that committee using existing rules
      if (actorUserId) {
        const member = await prisma.member.findFirst({
          where: { userId: actorUserId, organizationId, status: "ACTIVE" },
        });
        if (!member || member.deletedAt) {
          throw new PermissionDeniedError();
        }

        const userRoles = await prisma.userRole.findMany({
          where: { memberId: member.id },
          include: { role: true },
        });
        const isPresident = userRoles.some(ur => (ur.role.name === "Admin" || ur.role.name === "President") && !ur.role.deletedAt);

        if (!isPresident) {
          // Check CommitteeMember row
          const committeeMembers = await prisma.committeeMember.findMany({
            where: { committeeId: data.committeeId, memberId: member.id },
          });
          const isCM = committeeMembers.some(cm => !cm.deletedAt);

          // Also check Committee Head appointment (covers heads not explicitly added as members)
          const appointments = await prisma.appointment.findMany({
            where: {
              committeeId: data.committeeId,
              memberId: member.id,
              status: "ACTIVE",
            },
          });
          const isHead = !isCM && appointments.some(a => !a.deletedAt && ["Committee Head", "Head", "Chairman", "Chair", "Committee Lead", "Lead"].includes(a.designation));

          if (!isCM && !isHead) {
            throw new PermissionDeniedError();
          }
        }
      }
    }

    const event = await this.repository.create({
      organizationId,
      ...data,
    });

    if (actorUserId) {
      await logActivity(
        { userId: actorUserId, organizationId },
        "create",
        "event",
        event.id,
        event.title
      );
    }

    return event;
  }

  async getEvents(
    organizationId: string,
    params: PaginationQuery & { status?: EventStatus; committeeId?: string | null }
  ) {
    const paginationParams = buildPaginationParams(params);
    const { total, items } = await this.repository.list({
      ...paginationParams,
      organizationId,
      status: params.status,
      committeeId: params.committeeId,
    });

    return buildPaginatedResult(items, total, params);
  }

  async getEvent(id: string, organizationId: string, activeCommitteeId?: string | null) {
    const event = await this.repository.findById(id, organizationId);
    if (!event) throw new EventNotFoundError();

    if (activeCommitteeId && event.committeeId && event.committeeId !== activeCommitteeId) {
      throw new EventNotFoundError();
    }

    return event;
  }

  async updateEvent(
    id: string,
    organizationId: string,
    data: UpdateEventInput,
    actorUserId?: string,
    activeCommitteeId?: string | null
  ) {
    const event = await this.repository.findById(id, organizationId);
    if (!event) throw new EventNotFoundError();

    if (activeCommitteeId && event.committeeId && event.committeeId !== activeCommitteeId) {
      throw new EventNotFoundError();
    }

    // Explicitly omit committeeId from data to prevent reassignment
    const { committeeId, ...updateData } = data as any;

    const updated = await this.repository.update(id, organizationId, updateData);

    if (actorUserId) {
      await logActivity(
        { userId: actorUserId, organizationId },
        "update",
        "event",
        id,
        updated.title,
        data
      );
    }

    return updated;
  }

  async deleteEvent(id: string, organizationId: string, actorUserId?: string, activeCommitteeId?: string | null) {
    const event = await this.repository.findById(id, organizationId);
    if (!event) throw new EventNotFoundError();

    if (activeCommitteeId && event.committeeId && event.committeeId !== activeCommitteeId) {
      throw new EventNotFoundError();
    }

    const deleted = await this.repository.softDelete(id, organizationId);

    if (actorUserId) {
      await logActivity(
        { userId: actorUserId, organizationId },
        "delete",
        "event",
        id,
        event.title
      );
    }

    return deleted;
  }
}
