import { prisma } from "@/lib/prisma";
import { RegistrationStatus } from "@prisma/client";
import { buildOrderBy, PaginationParams } from "@/lib/pagination";

export interface RegisterMemberData {
  eventId: string;
  memberId: string;
  status?: RegistrationStatus;
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
      return prisma.eventRegistration.update({
        where: { id: existing.id },
        data: {
          status: data.status ?? "REGISTERED",
          deletedAt: null,
        },
      });
    }

    return prisma.eventRegistration.create({
      data: {
        eventId: data.eventId,
        memberId: data.memberId,
        status: data.status ?? "REGISTERED",
      },
    });
  }

  async cancel(eventId: string, memberId: string) {
    return prisma.eventRegistration.updateMany({
      where: {
        eventId,
        memberId,
        deletedAt: null,
      },
      data: {
        status: "CANCELLED",
        deletedAt: new Date(),
      },
    });
  }

  async findByEventAndMember(eventId: string, memberId: string) {
    return prisma.eventRegistration.findFirst({
      where: {
        eventId,
        memberId,
        deletedAt: null,
      },
    });
  }

  async list(eventId: string, params: PaginationParams) {
    const whereClause: any = {
      eventId,
      deletedAt: null,
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

    const [total, items] = await Promise.all([
      prisma.eventRegistration.count({ where: whereClause }),
      prisma.eventRegistration.findMany({
        where: whereClause,
        skip: params.skip,
        take: params.take,
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
      }),
    ]);

    return { total, items };
  }
}
