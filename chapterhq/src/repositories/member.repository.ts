import { prisma } from "@/lib/prisma";

interface CreateMemberData {
  organizationId: string;
  userId: string;
}

export class MemberRepository {
  async create(data: CreateMemberData) {
    return prisma.member.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
      },
    });
  }

  async findByOrganizationAndUser(organizationId: string, userId: string) {
    return prisma.member.findFirst({
      where: {
        deletedAt: null,
        organizationId,
        userId,
      },
    });
  }
}
