import { EventRepository } from "@/repositories/event.repository";
import { buildPaginationParams, buildPaginatedResult, PaginationQuery } from "@/lib/pagination";
import { logActivity } from "@/lib/audit-logger";
import { EventStatus } from "@prisma/client";

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
    params: PaginationQuery & { status?: EventStatus }
  ) {
    const paginationParams = buildPaginationParams(params);
    const { total, items } = await this.repository.list({
      ...paginationParams,
      organizationId,
      status: params.status,
    });

    return buildPaginatedResult(items, total, params);
  }

  async getEvent(id: string, organizationId: string) {
    const event = await this.repository.findById(id, organizationId);
    if (!event) throw new EventNotFoundError();
    return event;
  }

  async updateEvent(
    id: string,
    organizationId: string,
    data: UpdateEventInput,
    actorUserId?: string
  ) {
    const event = await this.repository.findById(id, organizationId);
    if (!event) throw new EventNotFoundError();

    const updated = await this.repository.update(id, organizationId, data);

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

  async deleteEvent(id: string, organizationId: string, actorUserId?: string) {
    const event = await this.repository.findById(id, organizationId);
    if (!event) throw new EventNotFoundError();

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
