import { EventRegistrationRepository } from "@/repositories/event-registration.repository";
import { AttendanceRepository } from "@/repositories/attendance.repository";
import { EventRepository } from "@/repositories/event.repository";
import { MemberRepository } from "@/repositories/member.repository";
import { ExternalRegistrationRepository } from "@/repositories/external-registration.repository";
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

export class AlreadyRegisteredError extends Error {
  constructor() {
    super("You are already registered for this event.");
    this.name = "AlreadyRegisteredError";
  }
}

export class AttendanceAlreadyMarkedError extends Error {
  constructor() {
    super("Attendance already marked for this participant.");
    this.name = "AttendanceAlreadyMarkedError";
  }
}

export class InvalidTokenError extends Error {
  constructor() {
    super("Invalid or expired check-in token.");
    this.name = "InvalidTokenError";
  }
}

export class EventRegistrationService {
  constructor(
    private readonly registrationRepo = new EventRegistrationRepository(),
    private readonly attendanceRepo = new AttendanceRepository(),
    private readonly eventRepo = new EventRepository(),
    private readonly memberRepo = new MemberRepository(),
    private readonly externalRepo = new ExternalRegistrationRepository()
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
    if (activeCommitteeId && event.committeeId && event.committeeId !== activeCommitteeId) {
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
    if (activeCommitteeId && event.committeeId && event.committeeId !== activeCommitteeId) {
      throw new EventNotFoundError();
    }

    const registration = await this.registrationRepo.findByEventAndMember(eventId, memberId);
    if (registration) {
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
      return;
    }

    const externalReg = await prisma.externalRegistration.findFirst({
      where: { id: memberId, eventId },
    });
    if (externalReg) {
      await this.externalRepo.cancel(memberId);
      if (actorUserId) {
        await logActivity(
          { userId: actorUserId, organizationId },
          "cancel",
          "external_registration",
          externalReg.id,
          event.title,
          { email: externalReg.email }
        );
      }
      return;
    }

    throw new RegistrationNotFoundError();
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
    if (activeCommitteeId && event.committeeId && event.committeeId !== activeCommitteeId) {
      throw new EventNotFoundError();
    }

    const [memberRegsResult, externalRegs] = await Promise.all([
      this.registrationRepo.list(eventId, { skip: 0, take: 9999, search: params.search, sortBy: "registeredAt", order: "desc" }),
      this.externalRepo.listByEvent(eventId),
    ]);

    const mappedExternalRegs = externalRegs.map((ext) => ({
      id: ext.id,
      eventId: ext.eventId,
      memberId: ext.id,
      status: ext.status,
      registeredAt: ext.registeredAt.toISOString(),
      member: {
        id: ext.id,
        user: {
          id: ext.id,
          name: ext.name,
          email: ext.email,
          image: null,
        },
      },
      isExternal: true,
      customAnswers: ext.customAnswers,
      committees: [] as { id: string; name: string }[],
    }));

    const combined = [
      ...memberRegsResult.items.map((item: any) => {
        const isAdmin = (item.member?.userRoles ?? []).some(
          (ur: any) => ur.role?.name?.toLowerCase() === "admin" || ur.role?.name?.toLowerCase() === "administrator"
        );
        const cmList = (item.member?.committeeMembers ?? [])
          .filter((cm: any) => !cm.deletedAt && !cm.committee?.deletedAt)
          .map((cm: any) => ({ id: cm.committee.id, name: cm.committee.name }));

        if (isAdmin) {
          if (!cmList.some((c: any) => c.name.toLowerCase() === "admin")) {
            cmList.unshift({ id: "admin-role", name: "Admin" });
          }
        }

        return {
          ...item,
          isExternal: false,
          committees: cmList,
        };
      }),
      ...mappedExternalRegs,
    ];

    let filtered = combined;
    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = combined.filter(
        (r) =>
          r.member.user.name?.toLowerCase().includes(q) ||
          r.member.user.email?.toLowerCase().includes(q)
      );
    }

    filtered.sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime());

    const total = filtered.length;
    const skip = (params.page - 1) * params.limit;
    const items = filtered.slice(skip, skip + params.limit);

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
    if (activeCommitteeId && event.committeeId && event.committeeId !== activeCommitteeId) {
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
    if (activeCommitteeId && event.committeeId && event.committeeId !== activeCommitteeId) {
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

  async bulkDeleteAttendance(
    organizationId: string,
    eventId: string,
    memberIds: string[],
    activeCommitteeId?: string | null
  ) {
    const event = await this.eventRepo.findById(eventId, organizationId);
    if (!event) {
      throw new EventNotFoundError();
    }
    if (activeCommitteeId && event.committeeId && event.committeeId !== activeCommitteeId) {
      throw new EventNotFoundError();
    }

    // Verify all members belong to the organization
    for (const memberId of memberIds) {
      const member = await this.memberRepo.findByIdAndOrganization(memberId, organizationId);
      if (!member) {
        throw new MemberNotFoundError();
      }
    }

    const result = await this.attendanceRepo.bulkDelete(eventId, memberIds);
    return result;
  }

  async getAttendanceList(organizationId: string, eventId: string, activeCommitteeId?: string | null) {
    const event = await this.eventRepo.findById(eventId, organizationId);
    if (!event) {
      throw new EventNotFoundError();
    }
    if (activeCommitteeId && event.committeeId && event.committeeId !== activeCommitteeId) {
      throw new EventNotFoundError();
    }

    return this.attendanceRepo.list(eventId);
  }

  // ─── Public Registration (member or external) ─────────────────────────────

  async publicRegisterMember(
    organizationId: string,
    eventId: string,
    memberId: string,
    customAnswers?: any
  ) {
    const event = await this.eventRepo.findById(eventId, organizationId);
    if (!event) throw new EventNotFoundError();
    if (event.status !== "PUBLISHED") throw new EventNotFoundError();

    const member = await this.memberRepo.findByIdAndOrganization(memberId, organizationId);
    if (!member) throw new MemberNotFoundError();

    // Check for existing active registration
    const existing = await this.registrationRepo.findByEventAndMember(eventId, memberId);
    if (existing && existing.status === "REGISTERED") {
      // Return existing so participant can see their QR again
      return existing;
    }

    // Check capacity
    if (event.capacity) {
      const activeRegistrations = await prisma.eventRegistration.findMany({
        where: { eventId, status: "REGISTERED" },
        select: { id: true, deletedAt: true },
      });
      const count = activeRegistrations.filter((r) => !r.deletedAt).length;
      if (count >= event.capacity) throw new RegistrationLimitExceededError();
    }

    return this.registrationRepo.register({ eventId, memberId, status: "REGISTERED", customAnswers });
  }

  async publicRegisterExternal(
    organizationId: string,
    eventId: string,
    data: { name: string; email: string; phone?: string; usn?: string; customAnswers?: any }
  ) {
    const event = await this.eventRepo.findById(eventId, organizationId);
    if (!event) throw new EventNotFoundError();
    if (event.status !== "PUBLISHED") throw new EventNotFoundError();

    // Check if email matches an existing org member — if so, link as member
    const userByEmail = await prisma.user.findFirst({ where: { email: data.email } });
    if (userByEmail) {
      const member = await prisma.member.findFirst({
        where: { userId: userByEmail.id, organizationId },
      });
      if (member && !member.deletedAt) {
        // Redirect to member registration path
        return {
          type: "member" as const,
          registration: await this.publicRegisterMember(organizationId, eventId, member.id, data.customAnswers),
        };
      }
    }

    // Check for duplicate external registration
    const existing = await this.externalRepo.findByEventAndEmail(eventId, data.email);
    if (existing && existing.status === "REGISTERED") {
      return { type: "external" as const, registration: existing };
    }

    // Check capacity (combined member + external registrations)
    if (event.capacity) {
      const memberRegs = await prisma.eventRegistration.findMany({
        where: { eventId, status: "REGISTERED" },
        select: { id: true, deletedAt: true },
      });
      const extRegs = await prisma.externalRegistration.findMany({
        where: { eventId, status: "REGISTERED" },
        select: { id: true, deletedAt: true },
      });
      const count =
        memberRegs.filter((r) => !r.deletedAt).length +
        extRegs.filter((r) => !r.deletedAt).length;
      if (count >= event.capacity) throw new RegistrationLimitExceededError();
    }

    const registration = await this.externalRepo.create({ eventId, ...data });
    return { type: "external" as const, registration };
  }

  // ─── QR Check-in (scan → verify → mark PRESENT) ─────────────────────────

  async processQrCheckIn(
    organizationId: string,
    eventId: string,
    token: string,
    actorUserId: string,
    activeCommitteeId?: string | null
  ) {
    // Verify event belongs to this org
    const event = await this.eventRepo.findById(eventId, organizationId);
    if (!event) throw new EventNotFoundError();
    if (activeCommitteeId && event.committeeId && event.committeeId !== activeCommitteeId) {
      throw new EventNotFoundError();
    }

    // Try member registration token first
    const memberReg = await this.registrationRepo.findByToken(token);
    if (memberReg) {
      // Verify this registration belongs to the requested event
      if (memberReg.eventId !== eventId) {
        throw new InvalidTokenError();
      }

      // Check registration is not cancelled/deleted
      if (memberReg.deletedAt || memberReg.status === "CANCELLED") {
        throw new InvalidTokenError();
      }

      // Check for duplicate attendance
      const existingAttendance = await this.attendanceRepo.findByEventAndMember(eventId, memberReg.memberId);
      if (existingAttendance && existingAttendance.status === "PRESENT") {
        throw new AttendanceAlreadyMarkedError();
      }

      // Mark PRESENT
      const attendance = await this.attendanceRepo.mark({
        eventId,
        memberId: memberReg.memberId,
        status: "PRESENT",
      });

      await logActivity(
        { userId: actorUserId, organizationId },
        "qr_checkin",
        "attendance",
        attendance.id,
        event.title,
        { memberId: memberReg.memberId, via: "qr_scan" }
      );

      return {
        participantName: memberReg.member.user.name ?? memberReg.member.user.email,
        participantType: "member" as const,
        attendance,
        customAnswers: memberReg.customAnswers,
      };
    }

    // Try external registration token
    const externalReg = await this.externalRepo.findByToken(token);
    if (externalReg) {
      // Verify this registration belongs to the requested event
      if (externalReg.eventId !== eventId) {
        throw new InvalidTokenError();
      }

      // Check registration is not cancelled/deleted
      if (externalReg.deletedAt || externalReg.status === "CANCELLED") {
        throw new InvalidTokenError();
      }

      // Check for duplicate attendance
      if (externalReg.attendance) {
        throw new AttendanceAlreadyMarkedError();
      }

      // Mark PRESENT
      const { attendance } = await this.externalRepo.markAttendance(externalReg.id, eventId);

      await logActivity(
        { userId: actorUserId, organizationId },
        "qr_checkin_external",
        "attendance",
        attendance.id,
        event.title,
        { externalRegistrationId: externalReg.id, via: "qr_scan" }
      );

      return {
        participantName: externalReg.name,
        participantType: "external" as const,
        attendance,
        customAnswers: externalReg.customAnswers,
        phone: externalReg.phone,
        usn: externalReg.usn,
      };
    }

    throw new InvalidTokenError();
  }

  // ─── Combined Attendance List (members + external) ─────────────────────────

  async getCombinedAttendanceData(
    organizationId: string,
    eventId: string,
    activeCommitteeId?: string | null
  ) {
    const event = await this.eventRepo.findById(eventId, organizationId);
    if (!event) throw new EventNotFoundError();
    if (activeCommitteeId && event.committeeId && event.committeeId !== activeCommitteeId) {
      throw new EventNotFoundError();
    }

    const [memberAttendance, externalRegs] = await Promise.all([
      this.attendanceRepo.list(eventId),
      this.externalRepo.listByEvent(eventId),
    ]);

    return { memberAttendance, externalRegs };
  }

  // ─── Attendance CSV Export ─────────────────────────────────────────────────

  async exportAttendanceCsv(
    organizationId: string,
    eventId: string,
    selectedMemberIds?: string[],
    selectedExternalIds?: string[],
    activeCommitteeId?: string | null
  ) {
    const event = await this.eventRepo.findById(eventId, organizationId);
    if (!event) throw new EventNotFoundError();
    if (activeCommitteeId && event.committeeId && event.committeeId !== activeCommitteeId) {
      throw new EventNotFoundError();
    }

    const { memberAttendance, externalRegs } = await this.getCombinedAttendanceData(
      organizationId,
      eventId,
      activeCommitteeId
    );

    // Get all member registrations (for members present in attendance but also registered)
    const allMemberRegs = await this.registrationRepo.list(eventId, {
      skip: 0, take: 9999, search: "", sortBy: "registeredAt", order: "desc"
    });

    const escapeCSV = (val: string | null | undefined) => {
      if (val == null) return "";
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = [
      "Type", "Name", "Email", "Phone", "USN",
      "Registration Time", "Attendance Status", "Attendance Time"
    ];

    const hasSelection = selectedMemberIds !== undefined || selectedExternalIds !== undefined;
    const rows: string[][] = [];

    // Member rows
    for (const att of memberAttendance) {
      if (hasSelection) {
        if (!selectedMemberIds || !selectedMemberIds.includes(att.memberId)) continue;
      }
      const memberReg = allMemberRegs.items.find((r) => r.memberId === att.memberId);
      rows.push([
        "Member",
        att.member.user.name ?? "",
        att.member.user.email ?? "",
        "",
        "",
        memberReg ? new Date(memberReg.registeredAt).toISOString() : "",
        att.status,
        att.markedAt ? new Date(att.markedAt).toISOString() : "",
      ]);
    }

    // External rows
    for (const ext of externalRegs) {
      if (hasSelection) {
        if (!selectedExternalIds || !selectedExternalIds.includes(ext.id)) continue;
      }
      rows.push([
        "External",
        ext.name,
        ext.email,
        ext.phone ?? "",
        ext.usn ?? "",
        new Date(ext.registeredAt).toISOString(),
        ext.attendance?.status ?? "NOT_CHECKED_IN",
        ext.attendance?.markedAt ? new Date(ext.attendance.markedAt).toISOString() : "",
      ]);
    }

    const csvLines = [headers.map(escapeCSV).join(","), ...rows.map((r) => r.map(escapeCSV).join(","))];
    return csvLines.join("\n");
  }
}
