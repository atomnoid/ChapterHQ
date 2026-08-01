import { AppointmentRepository } from "@/repositories/appointment.repository";
import { CommitteeRepository } from "@/repositories/committee.repository";
import { MemberRepository } from "@/repositories/member.repository";
import { buildPaginationParams, buildPaginatedResult, PaginationQuery } from "@/lib/pagination";
import { logActivity } from "@/lib/audit-logger";
import { AppointmentStatus } from "@prisma/client";

// ─── Domain Errors ────────────────────────────────────────────────────────────

export class AppointmentNotFoundError extends Error {
  constructor() {
    super("Appointment not found.");
    this.name = "AppointmentNotFoundError";
  }
}

export class DuplicateActiveAppointmentError extends Error {
  constructor() {
    super("An active appointment for this member, committee and designation already exists.");
    this.name = "DuplicateActiveAppointmentError";
  }
}

export class CommitteeNotFoundError extends Error {
  constructor() {
    super("Committee not found.");
    this.name = "CommitteeNotFoundError";
  }
}

export class MemberNotFoundError extends Error {
  constructor() {
    super("Member not found in this organization.");
    this.name = "MemberNotFoundError";
  }
}

// ─── Input Types ─────────────────────────────────────────────────────────────

interface CreateAppointmentInput {
  committeeId: string;
  memberId: string;
  designation: string;
  startDate: Date;
  endDate?: Date;
  status?: AppointmentStatus;
}

interface UpdateAppointmentInput {
  designation?: string;
  startDate?: Date;
  endDate?: Date;
  status?: AppointmentStatus;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class AppointmentService {
  constructor(
    private readonly appointmentRepo = new AppointmentRepository(),
    private readonly committeeRepo = new CommitteeRepository(),
    private readonly memberRepo = new MemberRepository()
  ) {}

  async createAppointment(
    organizationId: string,
    data: CreateAppointmentInput,
    actorUserId?: string
  ) {
    // Validate committee belongs to org
    const committee = await this.committeeRepo.findById(data.committeeId, organizationId);
    if (!committee) throw new CommitteeNotFoundError();

    // Validate member belongs to org
    const member = await this.memberRepo.findByIdAndOrganization(data.memberId, organizationId);
    if (!member) throw new MemberNotFoundError();

    // Prevent duplicate active appointment for same member + committee + designation
    const duplicate = await this.appointmentRepo.findActiveAppointment(
      data.memberId,
      data.committeeId,
      data.designation
    );
    if (duplicate) throw new DuplicateActiveAppointmentError();

    const appointment = await this.appointmentRepo.create({
      organizationId,
      ...data,
    });

    if (actorUserId) {
      await logActivity(
        { userId: actorUserId, organizationId },
        "create",
        "appointment",
        appointment.id,
        data.designation,
        { committeeId: data.committeeId, memberId: data.memberId }
      );
    }

    return appointment;
  }

  async getAppointments(
    organizationId: string,
    params: PaginationQuery & {
      committeeId?: string;
      memberId?: string;
      status?: AppointmentStatus;
    }
  ) {
    const paginationParams = buildPaginationParams(params);
    const { total, items } = await this.appointmentRepo.list({
      ...paginationParams,
      organizationId,
      committeeId: params.committeeId,
      memberId: params.memberId,
      status: params.status,
    });

    return buildPaginatedResult(items, total, params);
  }

  async getAppointment(id: string, organizationId: string) {
    const appointment = await this.appointmentRepo.findById(id, organizationId);
    if (!appointment) throw new AppointmentNotFoundError();
    return appointment;
  }

  async updateAppointment(
    id: string,
    organizationId: string,
    data: UpdateAppointmentInput,
    actorUserId?: string
  ) {
    const appointment = await this.appointmentRepo.findById(id, organizationId);
    if (!appointment) throw new AppointmentNotFoundError();

    // If designation is changing, guard against duplicate active appointments
    if (data.designation && data.designation.toLowerCase() !== appointment.designation.toLowerCase()) {
      const duplicate = await this.appointmentRepo.findActiveAppointment(
        appointment.memberId,
        appointment.committeeId,
        data.designation,
        id
      );
      if (duplicate) throw new DuplicateActiveAppointmentError();
    }

    const updated = await this.appointmentRepo.update(id, organizationId, data);

    if (actorUserId) {
      await logActivity(
        { userId: actorUserId, organizationId },
        "update",
        "appointment",
        id,
        updated.designation,
        data
      );
    }

    return updated;
  }

  async deleteAppointment(id: string, organizationId: string, actorUserId?: string) {
    const appointment = await this.appointmentRepo.findById(id, organizationId);
    if (!appointment) throw new AppointmentNotFoundError();

    const deleted = await this.appointmentRepo.softDelete(id, organizationId);

    if (actorUserId) {
      await logActivity(
        { userId: actorUserId, organizationId },
        "delete",
        "appointment",
        id,
        appointment.designation
      );
    }

    return deleted;
  }
}
