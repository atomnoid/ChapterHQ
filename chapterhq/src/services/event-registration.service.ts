import { EventRegistrationRepository } from "@/repositories/event-registration.repository";
import { AttendanceRepository } from "@/repositories/attendance.repository";
import { EventRepository } from "@/repositories/event.repository";
import { MemberRepository } from "@/repositories/member.repository";
import { buildPaginationParams, buildPaginatedResult, PaginationQuery } from "@/lib/pagination";
import { logActivity } from "@/lib/audit-logger";
import { AttendanceStatus, RegistrationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class EventNotFoundError extends Error {
  constructor() {
    super("Event not found.");
    this.name = "EventNotFoundError";
  }
}

export class MemberNotFoundError extends Error {
  constructor() {
    super("Member not found in this organization.");
    this.name = "MemberNotFoundError";
  }
}

export class RegistrationLimitExceededError extends Error {
  constructor() {
    super("Event capacity has been reached.");
    this.name = "RegistrationLimitExceededError";
  }
}

export class RegistrationNotFoundError extends Error {
  constructor() {
    super("Registration not found.");
    this.name = "RegistrationNotFoundError";
  }
}

export class EventRegistrationService {
  constructor(
    private readonly registrationRepo = new EventRegistrationRepository(),
    private readonly attendanceRepo = new AttendanceRepository(),
    private readonly eventRepo = new EventRepository(),
    private readonly memberRepo = new MemberRepository()
  ) {}

  async registerMember(
    organizationId: string,
    eventId: string,
    memberId: string,
    actorUserId?: string,
    activeCommitteeId?: string | null
  ) {
    const event = await this.eventRepo.findById(eventId, organizationId);
    if (!event) {
      throw new EventNotFoundError();
    }
    if (activeCommitteeId && event.committeeId !== activeCommitteeId) {
      throw new EventNotFoundError();
    }

    const member = await this.memberRepo.findByIdAndOrganization(memberId, organizationId);
    if (!member) {
      throw new MemberNotFoundError();
    }

    // Check capacity if set
    if (event.capacity) {
      // MongoDB Prisma bug: deletedAt: null in where clause returns no results.
      // Using findMany + JS filter instead of count().
      const activeRegistrations = await prisma.eventRegistration.findMany({
        where: { eventId, status: "REGISTERED" },
        select: { id: true, deletedAt: true },
      });
      const activeRegistrationsCount = activeRegistrations.filter((r) => !r.deletedAt).length;
      if (activeRegistrationsCount >= event.capacity) {
        throw new RegistrationLimitExceededError();
      }
    }

    const registration = await this.registrationRepo.register({
      eventId,
      memberId,
      status: "REGISTERED",
    });

    if (actorUserId) {
      await logActivity(
        { userId: actorUserId, organizationId },
        "register",
        "event_registration",
        registration.id,
        event.title,
        { memberId }
      );
    }

    return registration;
  }

  async cancelRegistration(
    organizationId: string,
    eventId: string,
    memberId: string,
    actorUserId?: string,
    activeCommitteeId?: string | null
  ) {
    const event = await this.eventRepo.findById(eventId, organizationId);
    if (!event) {
      throw new EventNotFoundError();
    }
    if (activeCommitteeId && event.committeeId !== activeCommitteeId) {
      throw new EventNotFoundError();
    }

    const registration = await this.registrationRepo.findByEventAndMember(eventId, memberId);
    if (!registration) {
      throw new RegistrationNotFoundError();
    }

    await this.registrationRepo.cancel(eventId, memberId);

    if (actorUserId) {
      await logActivity(
        { userId: actorUserId, organizationId },
        "cancel",
        "event_registration",
        registration.id,
        event.title,
        { memberId }
      );
    }
  }

  async getRegistrations(
    organizationId: string,
    eventId: string,
    params: PaginationQuery,
    activeCommitteeId?: string | null
  ) {
    const event = await this.eventRepo.findById(eventId, organizationId);
    if (!event) {
      throw new EventNotFoundError();
    }
    if (activeCommitteeId && event.committeeId !== activeCommitteeId) {
      throw new EventNotFoundError();
    }

    const paginationParams = buildPaginationParams(params);
    const { total, items } = await this.registrationRepo.list(eventId, paginationParams);

    return buildPaginatedResult(items, total, params);
  }

  async markAttendance(
    organizationId: string,
    eventId: string,
    data: { memberId: string; status: AttendanceStatus; notes?: string },
    actorUserId?: string,
    activeCommitteeId?: string | null
  ) {
    const event = await this.eventRepo.findById(eventId, organizationId);
    if (!event) {
      throw new EventNotFoundError();
    }
    if (activeCommitteeId && event.committeeId !== activeCommitteeId) {
      throw new EventNotFoundError();
    }

    const member = await this.memberRepo.findByIdAndOrganization(data.memberId, organizationId);
    if (!member) {
      throw new MemberNotFoundError();
    }

    const attendance = await this.attendanceRepo.mark({
      eventId,
      memberId: data.memberId,
      status: data.status,
      notes: data.notes,
    });

    if (actorUserId) {
      await logActivity(
        { userId: actorUserId, organizationId },
        "mark_attendance",
        "attendance",
        attendance.id,
        event.title,
        { memberId: data.memberId, status: data.status }
      );
    }

    return attendance;
  }

  async bulkUpdateAttendance(
    organizationId: string,
    eventId: string,
    items: { memberId: string; status: AttendanceStatus; notes?: string }[],
    actorUserId?: string,
    activeCommitteeId?: string | null
  ) {
    const event = await this.eventRepo.findById(eventId, organizationId);
    if (!event) {
      throw new EventNotFoundError();
    }
    if (activeCommitteeId && event.committeeId !== activeCommitteeId) {
      throw new EventNotFoundError();
    }

    // Verify all members belong to the organization
    for (const item of items) {
      const member = await this.memberRepo.findByIdAndOrganization(item.memberId, organizationId);
      if (!member) {
        throw new MemberNotFoundError();
      }
    }

    const results = await this.attendanceRepo.bulkUpdate(eventId, items);

    if (actorUserId) {
      await logActivity(
        { userId: actorUserId, organizationId },
        "bulk_mark_attendance",
        "attendance",
        eventId,
        event.title,
        { count: items.length }
      );
    }

    return results;
  }

  async getAttendanceList(organizationId: string, eventId: string, activeCommitteeId?: string | null) {
    const event = await this.eventRepo.findById(eventId, organizationId);
    if (!event) {
      throw new EventNotFoundError();
    }
    if (activeCommitteeId && event.committeeId !== activeCommitteeId) {
      throw new EventNotFoundError();
    }

    return this.attendanceRepo.list(eventId);
  }
}
