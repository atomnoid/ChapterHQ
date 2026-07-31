import { prisma } from "@/lib/prisma";

interface CreateInvitationData {
  organizationId: string;
  email: string;
  roleId?: string;
  token: string;
  expiresAt: Date;
}

export class InvitationRepository {
  async create(data: CreateInvitationData) {
    return prisma.invitation.create({
      data: {
        organizationId: data.organizationId,
        email: data.email,
        roleId: data.roleId,
        token: data.token,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findPendingByEmailAndOrg(email: string, organizationId: string) {
    return prisma.invitation.findFirst({
      where: {
        email,
        organizationId,
        status: "PENDING",
        deletedAt: null,
      },
    });
  }

  async findByIdAndOrg(id: string, organizationId: string) {
    return prisma.invitation.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
    });
  }

  async listByOrganization(organizationId: string) {
    return prisma.invitation.findMany({
      where: {
        organizationId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async softDelete(id: string, organizationId: string) {
    return prisma.invitation.update({
      where: { id },
      data: { deletedAt: new Date(), status: "CANCELLED" },
    });
  }
}
