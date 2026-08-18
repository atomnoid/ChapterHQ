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
              include: { role: { select: { id: true, name: true, description: true, deletedAt: true } } },
            },
            committeeMembers: {
              include: { committee: { select: { id: true, name: true, deletedAt: true } } },
            },
            appointments: {
              include: { committee: { select: { id: true, name: true, deletedAt: true } } },
            },
          },
        },
      },
      orderBy: { addedAt: "desc" },
    });

    // Post-filter soft-deleted records (MongoDB Prisma bug workaround)
    const activeRecords = records
      .filter((r) => !r.deletedAt)
      .map((r) => {
        // Post-filter nested relations for soft deletes
        const filteredRoles = r.member.userRoles.filter((ur) => !ur.role.deletedAt);
        const filteredCommittees = r.member.committeeMembers.filter((cm) => !cm.deletedAt && !cm.committee.deletedAt);
        const filteredAppointments = r.member.appointments.filter((app) => app.status === "ACTIVE" && !app.deletedAt && !app.committee.deletedAt);

        return {
          ...r,
          member: {
            ...r.member,
            userRoles: filteredRoles,
            committeeMembers: filteredCommittees,
            appointments: filteredAppointments,
          },
        };
      }) as unknown as CoreMemberWithDetails[];

    if (activeCommitteeId) {
      return activeRecords.filter((r) =>
        r.member.committeeMembers.some((cm) => cm.committee.id === activeCommitteeId)
      );
    }

    return activeRecords;
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
    const existing = await prisma.coreMember.findFirst({
      where: { organizationId: data.organizationId, memberId: data.memberId },
    });

    if (existing) {
      return prisma.coreMember.update({
        where: { id: existing.id },
        data: {
          deletedAt: null,
          note: data.note ?? null,
          addedAt: new Date(),
        },
      });
    }

    return prisma.coreMember.create({ data });
  }

  async softDelete(id: string, organizationId: string) {
    return prisma.coreMember.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
