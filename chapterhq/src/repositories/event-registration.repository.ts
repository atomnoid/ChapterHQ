import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { RegistrationStatus } from "@prisma/client";
import { buildOrderBy, PaginationParams } from "@/lib/pagination";
import crypto from "crypto";

function generateCheckInToken(): string {
  return "reg_" + crypto.randomBytes(24).toString("hex");
}

export interface RegisterMemberData {
  eventId: string;
  memberId: string;
  status?: RegistrationStatus;
  customAnswers?: any;
}

export class EventRegistrationRepository {
  async register(data: RegisterMemberData) {
    const existing = await prisma.eventRegistration.findFirst({
      where: {
        eventId: data.eventId,
        memberId: data.memberId,
      },
    });

    if (existing) {
      // Re-activating a cancelled registration: keep or generate token
      const token = existing.checkInToken ?? generateCheckInToken();
      return prisma.eventRegistration.update({
        where: { id: existing.id },
        data: {
          status: data.status ?? "REGISTERED",
          deletedAt: null,
          checkInToken: token,
          customAnswers: data.customAnswers !== undefined ? data.customAnswers : existing.customAnswers,
        },
      });
    }

    return prisma.eventRegistration.create({
      data: {
        eventId: data.eventId,
        memberId: data.memberId,
        status: data.status ?? "REGISTERED",
        checkInToken: generateCheckInToken(),
        customAnswers: data.customAnswers || null,
      },
    });
  }

  async cancel(eventId: string, memberId: string) {
    // MongoDB Prisma bug: deletedAt: null in where clause returns no results.
    // Removing filter is safe — updating already-cancelled records is idempotent.
    return prisma.eventRegistration.updateMany({
      where: { eventId, memberId },
      data: {
        status: "CANCELLED",
        deletedAt: new Date(),
      },
    });
  }

  async findByEventAndMember(eventId: string, memberId: string) {
    // MongoDB Prisma bug: deletedAt: null in where clause returns no results.
    const reg = await prisma.eventRegistration.findFirst({
      where: { eventId, memberId },
    });
    if (reg?.deletedAt) return null;
    return reg;
  }

  async findByToken(token: string) {
    return prisma.eventRegistration.findUnique({
      where: { checkInToken: token },
      include: {
        event: true,
        member: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  async list(eventId: string, params: PaginationParams) {
    const whereClause: Prisma.EventRegistrationWhereInput = {
      eventId,
      // MongoDB Prisma bug: deletedAt: null removed; JS post-filter applied below.
    };

    if (params.search) {
      whereClause.member = {
        user: {
          OR: [
            { name: { contains: params.search, mode: "insensitive" } },
            { email: { contains: params.search, mode: "insensitive" } },
          ],
        },
      };
    }

    const orderBy = buildOrderBy(params.sortBy, params.order, "registeredAt");

    const allItems = await prisma.eventRegistration.findMany({
      where: whereClause,
      orderBy,
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
    });

    // Post-filter soft-deleted records in JS (MongoDB Prisma bug workaround).
    const notDeleted = allItems.filter((r) => !r.deletedAt);
    const total = notDeleted.length;
    const items = notDeleted.slice(params.skip, params.skip + params.take);

    return { total, items };
  }
}
