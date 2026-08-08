import { prisma } from "@/lib/prisma";
import { buildOrderBy, PaginationParams } from "@/lib/pagination";
import { EventStatus } from "@prisma/client";

interface CreateEventData {
  organizationId: string;
  committeeId?: string;
  title: string;
  description?: string;
  venue?: string;
  startDate: Date;
  endDate?: Date;
  capacity?: number;
  registrationRequired?: boolean;
  status?: EventStatus;
}

interface UpdateEventData {
  title?: string;
  description?: string;
  venue?: string;
  startDate?: Date;
  endDate?: Date;
  capacity?: number;
  registrationRequired?: boolean;
  status?: EventStatus;
  committeeId?: string | null;
}

export class EventRepository {
  async create(data: CreateEventData) {
    return prisma.event.create({
      data: {
        organizationId: data.organizationId,
        committeeId: data.committeeId,
        title: data.title,
        description: data.description,
        venue: data.venue,
        startDate: data.startDate,
        endDate: data.endDate,
        capacity: data.capacity,
        registrationRequired: data.registrationRequired ?? false,
        status: data.status ?? "DRAFT",
      },
    });
  }

  async update(id: string, organizationId: string, data: UpdateEventData) {
    return prisma.event.update({
      where: { id, organizationId },
      data,
    });
  }

  async findById(id: string, organizationId: string) {
    // MongoDB Prisma bug: deletedAt: null in where clause returns no results.
    const event = await prisma.event.findFirst({
      where: { id, organizationId },
    });
    if (event?.deletedAt) return null;
    return event;
  }

  async list(
    params: PaginationParams & {
      organizationId: string;
      status?: EventStatus;
      committeeId?: string | null;
    }
  ) {
    const whereClause: any = {
      organizationId: params.organizationId,
      // MongoDB Prisma bug: deletedAt: null removed; JS post-filter applied below.
    };

    if (params.status) whereClause.status = params.status;

    // Filter by committeeId only if a non-null/non-undefined value is provided
    if (params.committeeId !== undefined && params.committeeId !== null) {
      whereClause.committeeId = params.committeeId;
    }

    if (params.search) {
      whereClause.OR = [
        { title: { contains: params.search, mode: "insensitive" } },
        { description: { contains: params.search, mode: "insensitive" } },
        { venue: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const orderBy = buildOrderBy(params.sortBy, params.order, "startDate");

    const allItems = await prisma.event.findMany({
      where: whereClause,
      orderBy,
    });

    // Post-filter soft-deleted records in JS (MongoDB Prisma bug workaround).
    const notDeleted = allItems.filter((e) => !e.deletedAt);
    const total = notDeleted.length;
    const items = notDeleted.slice(params.skip, params.skip + params.take);

    return { total, items };
  }

  async softDelete(id: string, organizationId: string) {
    return prisma.event.update({
      where: { id, organizationId },
      data: { deletedAt: new Date(), status: "CANCELLED" },
    });
  }
}
