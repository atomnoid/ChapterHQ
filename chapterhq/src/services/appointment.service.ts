import { AppointmentRepository } from "@/repositories/appointment.repository";
import { CommitteeRepository } from "@/repositories/committee.repository";
import { MemberRepository } from "@/repositories/member.repository";
import { buildPaginationParams, buildPaginatedResult, PaginationQuery } from "@/lib/pagination";
import { logActivity } from "@/lib/audit-logger";
import { AppointmentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SystemNotificationService } from "@/services/system-notification.service";

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

export class MemberNotInCommitteeError extends Error {
  constructor() {
    super("The specified member does not belong to the active committee.");
    this.name = "MemberNotInCommitteeError";
  }
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
    private readonly memberRepo = new MemberRepository(),
    private readonly systemNotificationService = new SystemNotificationService()
  ) {}

  async createAppointment(
    organizationId: string,
    data: CreateAppointmentInput,
    actorUserId?: string,
    activeCommitteeId?: string | null
  ) {
    // ── Committee boundary ────────────────────────────────────────────────────
    // If a committee is active, the trusted server-side activeCommitteeId wins.
    // The committeeId already reflects this at the route layer; here we validate
    // the committee belongs to the org and that the actor has access to it.
    // Validate committee belongs to org and is not deleted
    const committee = await prisma.committee.findFirst({
      where: { id: data.committeeId, organizationId },
    });
    if (!committee || committee.deletedAt) throw new CommitteeNotFoundError();

    // Validate actor has access to the committee (President bypass, or CM member)
    if (actorUserId) {
      const actorMember = await prisma.member.findFirst({
        where: { userId: actorUserId, organizationId, status: "ACTIVE" },
      });
      if (!actorMember || actorMember.deletedAt) throw new MemberNotFoundError();

      const userRoles = await prisma.userRole.findMany({
        where: { memberId: actorMember.id },
        include: { role: true },
      });
      const isPresident = userRoles.some((ur) => (ur.role.name === "Admin" || ur.role.name === "President") && !ur.role.deletedAt);

      if (!isPresident) {
        const isCM = await prisma.committeeMember.findFirst({
          where: { committeeId: data.committeeId, memberId: actorMember.id },
        });
        if (!isCM || isCM.deletedAt) throw new CommitteeNotFoundError();
      }
    }

    // ── Member boundary ───────────────────────────────────────────────────────
    // Validate member belongs to org
    const member = await this.memberRepo.findByIdAndOrganization(data.memberId, organizationId);
    if (!member) throw new MemberNotFoundError();

    // When a committee is active, additionally validate that the target member
    // belongs to that committee. This prevents Committee A from creating an
    // appointment using a Committee B memberId (Test Case 7).
    if (activeCommitteeId) {
      const memberInCommittee = await prisma.committeeMember.findFirst({
        where: { committeeId: activeCommitteeId, memberId: data.memberId },
      });
      if (!memberInCommittee || memberInCommittee.deletedAt) throw new MemberNotInCommitteeError();
    }

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

    // The appointment is already committed. Notification delivery must never turn
    // a successful appointment action into a failed request.
    try {
      await this.systemNotificationService.notifyMember({
        organizationId,
        memberId: appointment.memberId,
        sourceType: "APPOINTMENT",
        sourceId: appointment.id,
        eventType: "APPOINTMENT_CREATED",
        title: "Appointment Created",
        message: `An appointment has been created for you${appointment.designation ? `: ${appointment.designation}.` : "."}`,
      });
    } catch (error) {
      console.error("[SystemNotification] appointment delivery failed", error);
    }

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
    },
    activeCommitteeId?: string | null
  ) {
    const paginationParams = buildPaginationParams(params);

    // ── Committee boundary ────────────────────────────────────────────────────
    // When a committee is active, the trusted server-side activeCommitteeId
    // overrides any client-supplied committeeId query parameter (V-05).
    // When no committee is active, the client committeeId is ignored to avoid
    // leaking cross-committee data; listing falls back to org-wide.
    const resolvedCommitteeId = activeCommitteeId ?? undefined;

    const { total, items } = await this.appointmentRepo.list({
      ...paginationParams,
      organizationId,
      committeeId: resolvedCommitteeId,
      memberId: params.memberId,
      status: params.status,
    });

    return buildPaginatedResult(items, total, params);
  }

  async getAppointment(id: string, organizationId: string, activeCommitteeId?: string | null) {
    const appointment = await this.appointmentRepo.findById(id, organizationId);
    if (!appointment) throw new AppointmentNotFoundError();

    // ── Committee boundary ────────────────────────────────────────────────────
    // When a committee is active, the appointment must belong to it.
    // Return 404 (AppointmentNotFoundError) on mismatch to avoid leaking
    // whether the appointment exists in another committee (V-03).
    if (activeCommitteeId && appointment.committeeId !== activeCommitteeId) {
      throw new AppointmentNotFoundError();
    }

    return appointment;
  }

  async updateAppointment(
    id: string,
    organizationId: string,
    data: UpdateAppointmentInput,
    actorUserId?: string,
    activeCommitteeId?: string | null
  ) {
    // getAppointment enforces the committee boundary — throws AppointmentNotFoundError
    // if the appointment does not belong to activeCommitteeId (V-03).
    const appointment = await this.getAppointment(id, organizationId, activeCommitteeId);

    // Do NOT allow a client to move an appointment between committees.
    // committeeId is not in UpdateAppointmentInput, but defensively strip it here.
    const { committeeId: _ignored, ...updateData } = data as any;

    // If designation is changing, guard against duplicate active appointments
    if (updateData.designation && updateData.designation.toLowerCase() !== appointment.designation.toLowerCase()) {
      const duplicate = await this.appointmentRepo.findActiveAppointment(
        appointment.memberId,
        appointment.committeeId,
        updateData.designation,
        id
      );
      if (duplicate) throw new DuplicateActiveAppointmentError();
    }

    const updated = await this.appointmentRepo.update(id, organizationId, updateData);

    if (actorUserId) {
      await logActivity(
        { userId: actorUserId, organizationId },
        "update",
        "appointment",
        id,
        updated.designation,
        updateData
      );
    }

    return updated;
  }

  async deleteAppointment(id: string, organizationId: string, actorUserId?: string, activeCommitteeId?: string | null) {
    // getAppointment enforces the committee boundary — throws AppointmentNotFoundError
    // if the appointment does not belong to activeCommitteeId (V-03).
    const appointment = await this.getAppointment(id, organizationId, activeCommitteeId);

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
