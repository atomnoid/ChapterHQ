import { prisma } from "@/lib/prisma";
import { AttendanceStatus } from "@prisma/client";

export interface MarkAttendanceData {
  eventId: string;
  memberId: string;
  status: AttendanceStatus;
  notes?: string;
}

export class AttendanceRepository {
  async mark(data: MarkAttendanceData) {
    const existing = await prisma.attendance.findFirst({
      where: {
        eventId: data.eventId,
        memberId: data.memberId,
      },
    });

    if (existing) {
      return prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status: data.status,
          notes: data.notes ?? null,
          markedAt: new Date(),
        },
      });
    }

    return prisma.attendance.create({
      data: {
        eventId: data.eventId,
        memberId: data.memberId,
        status: data.status,
        notes: data.notes,
      },
    });
  }

  async bulkUpdate(eventId: string, items: { memberId: string; status: AttendanceStatus; notes?: string }[]) {
    // Since MongoDB in Prisma doesn't support easy bulk upsert in one call, we can perform them in a transaction or Promise.all.
    const operations = items.map((item) => {
      return prisma.attendance.upsert({
        where: {
          eventId_memberId: {
            eventId,
            memberId: item.memberId,
          },
        },
        update: {
          status: item.status,
          notes: item.notes ?? null,
          markedAt: new Date(),
        },
        create: {
          eventId,
          memberId: item.memberId,
          status: item.status,
          notes: item.notes,
        },
      });
    });

    return prisma.$transaction(operations);
  }

  async list(eventId: string) {
    return prisma.attendance.findMany({
      where: {
        eventId,
      },
      include: {
        member: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
      orderBy: {
        markedAt: "desc",
      },
    });
  }

  async findByEventAndMember(eventId: string, memberId: string) {
    return prisma.attendance.findFirst({
      where: {
        eventId,
        memberId,
      },
    });
  }

  async bulkDelete(eventId: string, memberIds: string[]) {
    return prisma.attendance.deleteMany({
      where: {
        eventId,
        memberId: {
          in: memberIds,
        },
      },
    });
  }
}
