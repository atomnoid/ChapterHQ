import { prisma } from "@/lib/prisma";
import { buildOrderBy, PaginationParams } from "@/lib/pagination";
import { AppointmentStatus } from "@prisma/client";

interface CreateAppointmentData {
  organizationId: string;
  committeeId: string;
  memberId: string;
  designation: string;
  startDate: Date;
  endDate?: Date;
  status?: AppointmentStatus;
}

interface UpdateAppointmentData {
  designation?: string;
  startDate?: Date;
  endDate?: Date;
  status?: AppointmentStatus;
}

const MEMBER_INCLUDE = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  },
} as const;

const DEFAULT_INCLUDE = {
  member: { include: MEMBER_INCLUDE },
  committee: { select: { id: true, name: true } },
} as const;

export class AppointmentRepository {
  async create(data: CreateAppointmentData) {
    return prisma.appointment.create({
      data: {
        organizationId: data.organizationId,
        committeeId: data.committeeId,
        memberId: data.memberId,
        designation: data.designation,
        startDate: data.startDate,
        endDate: data.endDate,
        status: data.status ?? "ACTIVE",
      },
      include: DEFAULT_INCLUDE,
    });
  }

  async update(id: string, organizationId: string, data: UpdateAppointmentData) {
    return prisma.appointment.update({
      where: { id, organizationId },
      data,
      include: DEFAULT_INCLUDE,
    });
  }

  async findById(id: string, organizationId: string) {
    return prisma.appointment.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: DEFAULT_INCLUDE,
    });
  }

  async list(params: PaginationParams & { organizationId: string; committeeId?: string; memberId?: string; status?: AppointmentStatus }) {
    const whereClause: any = {
      organizationId: params.organizationId,
      deletedAt: null,
    };

    if (params.committeeId) whereClause.committeeId = params.committeeId;
    if (params.memberId) whereClause.memberId = params.memberId;
    if (params.status) whereClause.status = params.status;

    if (params.search) {
      whereClause.designation = { contains: params.search, mode: "insensitive" };
    }

    const orderBy = buildOrderBy(params.sortBy, params.order, "startDate");

    const [total, items] = await Promise.all([
      prisma.appointment.count({ where: whereClause }),
      prisma.appointment.findMany({
        where: whereClause,
        skip: params.skip,
        take: params.take,
        orderBy,
        include: DEFAULT_INCLUDE,
      }),
    ]);

    return { total, items };
  }

  async listByCommittee(committeeId: string, organizationId: string, params: PaginationParams) {
    return this.list({ ...params, organizationId, committeeId });
  }

  async listByMember(memberId: string, organizationId: string, params: PaginationParams) {
    return this.list({ ...params, organizationId, memberId });
  }

  /**
   * Find an active appointment for the same member + committee + designation
   * (excludes soft-deleted, excludes optional excludeId for update scenarios).
   */
  async findActiveAppointment(
    memberId: string,
    committeeId: string,
    designation: string,
    excludeId?: string
  ) {
    return prisma.appointment.findFirst({
      where: {
        memberId,
        committeeId,
        designation: { equals: designation, mode: "insensitive" },
        status: "ACTIVE",
        deletedAt: null,
        NOT: excludeId ? { id: excludeId } : undefined,
      },
    });
  }

  async softDelete(id: string, organizationId: string) {
    return prisma.appointment.update({
      where: { id, organizationId },
      data: { deletedAt: new Date(), status: "REVOKED" },
    });
  }
}
