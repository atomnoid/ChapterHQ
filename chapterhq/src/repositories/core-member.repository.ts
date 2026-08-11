import { prisma } from "@/lib/prisma";

export interface CoreMemberWithDetails {
  id: string;
  organizationId: string;
  memberId: string;
  note: string | null;
  addedAt: Date;
  deletedAt: Date | null;
  member: {
    id: string;
    user: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
    };
    userRoles: {
      role: { id: string; name: string; description: string | null };
    }[];
    committeeMembers: {
      committee: { id: string; name: string };
    }[];
    appointments: {
      id: string;
      designation: string;
      status: string;
      committee: { id: string; name: string };
    }[];
  };
}

export class CoreMemberRepository {
  async list(organizationId: string, activeCommitteeId?: string | null): Promise<CoreMemberWithDetails[]> {
    const records = await prisma.coreMember.findMany({
      where: { organizationId },
      include: {
        member: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
            userRoles: {
              include: { role: { select: { id: true, name: true, description: true } } },
              where: { role: { deletedAt: null } },
            },
            committeeMembers: {
              where: { deletedAt: null },
              include: { committee: { select: { id: true, name: true } } },
            },
            appointments: {
              where: { status: "ACTIVE", deletedAt: null },
              include: { committee: { select: { id: true, name: true } } },
            },
          },
        },
      },
      orderBy: { addedAt: "desc" },
    });

    // Post-filter soft-deleted (MongoDB Prisma bug workaround)
    const notDeleted = records.filter((r) => !r.deletedAt) as unknown as CoreMemberWithDetails[];

    if (activeCommitteeId) {
      return notDeleted.filter((r) =>
        r.member.committeeMembers.some((cm) => cm.committee.id === activeCommitteeId)
      );
    }

    return notDeleted;
  }

  async findById(id: string, organizationId: string) {
    const record = await prisma.coreMember.findFirst({
      where: { id, organizationId },
    });
    if (record?.deletedAt) return null;
    return record;
  }

  async findByMember(organizationId: string, memberId: string) {
    const record = await prisma.coreMember.findFirst({
      where: { organizationId, memberId },
    });
    if (record?.deletedAt) return null;
    return record;
  }

  async create(data: { organizationId: string; memberId: string; note?: string }) {
    return prisma.coreMember.create({ data });
  }

  async softDelete(id: string, organizationId: string) {
    return prisma.coreMember.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
