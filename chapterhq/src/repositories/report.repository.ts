import { prisma } from "@/lib/prisma";

const db = prisma as any;

interface MonthBucket {
  month: string;
}

export interface MembersMonthlyTrend extends MonthBucket {
  joined: number;
}

export interface MembersReport {
  summary: {
    totalMembers: number;
    activeMembers: number;
    pendingMembers: number;
    leftMembers: number;
    blockedMembers: number;
    newMembersThisMonth: number;
  };
  monthlyTrends: MembersMonthlyTrend[];
}

export interface EventsMonthlyTrend extends MonthBucket {
  created: number;
  registrations: number;
}

export interface EventsReport {
  summary: {
    totalEvents: number;
    draftEvents: number;
    publishedEvents: number;
    cancelledEvents: number;
    completedEvents: number;
    totalRegistrations: number;
    attendanceRecords: number;
  };
  monthlyTrends: EventsMonthlyTrend[];
}

export interface FinanceMonthlyTrend extends MonthBucket {
  income: number;
  expense: number;
  net: number;
  transactions: number;
}

export interface FinanceReport {
  summary: {
    totalIncome: number;
    totalExpense: number;
    netBalance: number;
    transactionCount: number;
  };
  monthlyTrends: FinanceMonthlyTrend[];
}

export interface AttendanceMonthlyTrend extends MonthBucket {
  present: number;
  absent: number;
  excused: number;
  total: number;
  attendanceRate: number;
}

export interface AttendanceReport {
  summary: {
    totalRecords: number;
    presentCount: number;
    absentCount: number;
    excusedCount: number;
    attendanceRate: number;
  };
  monthlyTrends: AttendanceMonthlyTrend[];
}

const MONTH_WINDOW = 12;

const MEMBER_STATUS = {
  ACTIVE: "ACTIVE",
  PENDING: "PENDING",
  LEFT: "LEFT",
  BLOCKED: "BLOCKED",
} as const;

const EVENT_STATUS = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED",
} as const;

const TRANSACTION_TYPE = {
  INCOME: "INCOME",
  EXPENSE: "EXPENSE",
} as const;

const ATTENDANCE_STATUS = {
  PRESENT: "PRESENT",
  ABSENT: "ABSENT",
  EXCUSED: "EXCUSED",
} as const;

function getMonthKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getRecentMonthStarts(count: number): Date[] {
  const now = new Date();
  const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const months: Date[] = [];

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    months.push(
      new Date(Date.UTC(currentMonthStart.getUTCFullYear(), currentMonthStart.getUTCMonth() - offset, 1))
    );
  }

  return months;
}

function buildMonthMap<T extends Record<string, number>>(months: Date[], factory: () => T) {
  const map = new Map<string, T>();
  for (const monthStart of months) {
    map.set(getMonthKey(monthStart), factory());
  }
  return map;
}

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

export class ReportRepository {
  async getMembersReport(organizationId: string): Promise<MembersReport> {
    const months = getRecentMonthStarts(MONTH_WINDOW);
    const firstMonthStart = months[0];
    const currentMonthStart = months[months.length - 1];

    // MongoDB Prisma bug: deletedAt: null in where clause returns no results.
    const allMembers = await db.member.findMany({
      where: { organizationId },
      select: { status: true, joinedAt: true, deletedAt: true },
    });

    // Post-filter soft-deleted records in JS.
    const members = allMembers.filter((m: any) => !m.deletedAt);

    const monthlyMap = buildMonthMap(months, () => ({ joined: 0 }));

    let activeMembers = 0;
    let pendingMembers = 0;
    let leftMembers = 0;
    let blockedMembers = 0;
    let newMembersThisMonth = 0;

    for (const member of members) {
      if (member.status === MEMBER_STATUS.ACTIVE) activeMembers += 1;
      if (member.status === MEMBER_STATUS.PENDING) pendingMembers += 1;
      if (member.status === MEMBER_STATUS.LEFT) leftMembers += 1;
      if (member.status === MEMBER_STATUS.BLOCKED) blockedMembers += 1;

      if (member.joinedAt >= currentMonthStart) {
        newMembersThisMonth += 1;
      }

      if (member.joinedAt >= firstMonthStart) {
        const key = getMonthKey(member.joinedAt);
        const bucket = monthlyMap.get(key);
        if (bucket) {
          bucket.joined += 1;
        }
      }
    }

    return {
      summary: {
        totalMembers: members.length,
        activeMembers,
        pendingMembers,
        leftMembers,
        blockedMembers,
        newMembersThisMonth,
      },
      monthlyTrends: months.map((monthStart) => {
        const month = getMonthKey(monthStart);
        const bucket = monthlyMap.get(month);
        return {
          month,
          joined: bucket?.joined ?? 0,
        };
      }),
    };
  }

  async getEventsReport(organizationId: string, committeeId?: string | null): Promise<EventsReport> {
    const months = getRecentMonthStarts(MONTH_WINDOW);
    const firstMonthStart = months[0];

    // MongoDB Prisma bug: deletedAt: null (including nested relation filters) returns no results.
    const [allEvents, allRegistrations, allAttendanceRows] = await Promise.all([
      db.event.findMany({
        where: {
          organizationId,
          ...(committeeId ? { committeeId } : {}),
        },
        select: { status: true, createdAt: true, deletedAt: true },
      }),
      db.eventRegistration.findMany({
        where: {
          event: {
            organizationId,
            ...(committeeId ? { committeeId } : {}),
          },
        },
        select: { registeredAt: true, deletedAt: true },
      }),
      db.attendance.findMany({
        where: {
          event: {
            organizationId,
            ...(committeeId ? { committeeId } : {}),
          },
        },
        select: { id: true, event: { select: { deletedAt: true } } },
      }),
    ]);

    // Post-filter soft-deleted records in JS.
    const events = allEvents.filter((e: any) => !e.deletedAt);
    const registrations = allRegistrations.filter((r: any) => !r.deletedAt);
    const attendanceRecords = allAttendanceRows.filter(
      (attendance: any) => !attendance.event?.deletedAt,
    ).length;

    const monthlyMap = buildMonthMap(months, () => ({ created: 0, registrations: 0 }));

    let draftEvents = 0;
    let publishedEvents = 0;
    let cancelledEvents = 0;
    let completedEvents = 0;

    for (const event of events) {
      if (event.status === EVENT_STATUS.DRAFT) draftEvents += 1;
      if (event.status === EVENT_STATUS.PUBLISHED) publishedEvents += 1;
      if (event.status === EVENT_STATUS.CANCELLED) cancelledEvents += 1;
      if (event.status === EVENT_STATUS.COMPLETED) completedEvents += 1;

      if (event.createdAt >= firstMonthStart) {
        const key = getMonthKey(event.createdAt);
        const bucket = monthlyMap.get(key);
        if (bucket) {
          bucket.created += 1;
        }
      }
    }

    for (const registration of registrations) {
      if (registration.registeredAt >= firstMonthStart) {
        const key = getMonthKey(registration.registeredAt);
        const bucket = monthlyMap.get(key);
        if (bucket) {
          bucket.registrations += 1;
        }
      }
    }

    return {
      summary: {
        totalEvents: events.length,
        draftEvents,
        publishedEvents,
        cancelledEvents,
        completedEvents,
        totalRegistrations: registrations.length,
        attendanceRecords,
      },
      monthlyTrends: months.map((monthStart) => {
        const month = getMonthKey(monthStart);
        const bucket = monthlyMap.get(month);
        return {
          month,
          created: bucket?.created ?? 0,
          registrations: bucket?.registrations ?? 0,
        };
      }),
    };
  }

  async getFinanceReport(organizationId: string, committeeId?: string | null): Promise<FinanceReport> {
    const months = getRecentMonthStarts(MONTH_WINDOW);
    const firstMonthStart = months[0];

    // MongoDB Prisma bug: deletedAt: null in where clause returns no results.
    const allRecords = await db.financeRecord.findMany({
      where: {
        organizationId,
        ...(committeeId ? { committeeId } : {}),
      },
      select: { type: true, amount: true, date: true, deletedAt: true },
    });

    // Post-filter soft-deleted records in JS.
    const records = allRecords.filter((r: any) => !r.deletedAt);

    const monthlyMap = buildMonthMap(months, () => ({ income: 0, expense: 0, net: 0, transactions: 0 }));

    let totalIncome = 0;
    let totalExpense = 0;

    for (const record of records) {
      if (record.type === TRANSACTION_TYPE.INCOME) {
        totalIncome += record.amount;
      }
      if (record.type === TRANSACTION_TYPE.EXPENSE) {
        totalExpense += record.amount;
      }

      if (record.date >= firstMonthStart) {
        const key = getMonthKey(record.date);
        const bucket = monthlyMap.get(key);

        if (bucket) {
          if (record.type === TRANSACTION_TYPE.INCOME) {
            bucket.income += record.amount;
          } else if (record.type === TRANSACTION_TYPE.EXPENSE) {
            bucket.expense += record.amount;
          }

          bucket.transactions += 1;
          bucket.net = bucket.income - bucket.expense;
        }
      }
    }

    return {
      summary: {
        totalIncome: roundTo2(totalIncome),
        totalExpense: roundTo2(totalExpense),
        netBalance: roundTo2(totalIncome - totalExpense),
        transactionCount: records.length,
      },
      monthlyTrends: months.map((monthStart) => {
        const month = getMonthKey(monthStart);
        const bucket = monthlyMap.get(month);
        return {
          month,
          income: roundTo2(bucket?.income ?? 0),
          expense: roundTo2(bucket?.expense ?? 0),
          net: roundTo2(bucket?.net ?? 0),
          transactions: bucket?.transactions ?? 0,
        };
      }),
    };
  }

  async getAttendanceReport(organizationId: string): Promise<AttendanceReport> {
    const months = getRecentMonthStarts(MONTH_WINDOW);
    const firstMonthStart = months[0];

    // MongoDB Prisma bug: nested relation filter { event: { deletedAt: null } } returns no results.
    const allRecords = await db.attendance.findMany({
      where: { event: { organizationId } },
      select: {
        status: true,
        markedAt: true,
        event: { select: { deletedAt: true } },
      },
    });

    // Post-filter records from soft-deleted events because MongoDB Prisma
    // cannot reliably apply nested deletedAt: null relation filters.
    const records = allRecords.filter((record: any) => !record.event?.deletedAt);

    const monthlyMap = buildMonthMap(months, () => ({ present: 0, absent: 0, excused: 0, total: 0, attendanceRate: 0 }));

    let presentCount = 0;
    let absentCount = 0;
    let excusedCount = 0;

    for (const record of records) {
      if (record.status === ATTENDANCE_STATUS.PRESENT) presentCount += 1;
      if (record.status === ATTENDANCE_STATUS.ABSENT) absentCount += 1;
      if (record.status === ATTENDANCE_STATUS.EXCUSED) excusedCount += 1;

      if (record.markedAt >= firstMonthStart) {
        const key = getMonthKey(record.markedAt);
        const bucket = monthlyMap.get(key);

        if (bucket) {
          if (record.status === ATTENDANCE_STATUS.PRESENT) bucket.present += 1;
          if (record.status === ATTENDANCE_STATUS.ABSENT) bucket.absent += 1;
          if (record.status === ATTENDANCE_STATUS.EXCUSED) bucket.excused += 1;

          bucket.total += 1;
        }
      }
    }

    const totalRecords = records.length;
    const attendanceRate = totalRecords > 0 ? roundTo2((presentCount / totalRecords) * 100) : 0;

    return {
      summary: {
        totalRecords,
        presentCount,
        absentCount,
        excusedCount,
        attendanceRate,
      },
      monthlyTrends: months.map((monthStart) => {
        const month = getMonthKey(monthStart);
        const bucket = monthlyMap.get(month) ?? {
          present: 0,
          absent: 0,
          excused: 0,
          total: 0,
          attendanceRate: 0,
        };

        const monthlyAttendanceRate = bucket.total > 0
          ? roundTo2((bucket.present / bucket.total) * 100)
          : 0;

        return {
          month,
          present: bucket.present,
          absent: bucket.absent,
          excused: bucket.excused,
          total: bucket.total,
          attendanceRate: monthlyAttendanceRate,
        };
      }),
    };
  }
}
