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
    // MongoDB Prisma bug: deletedAt: null in where clause returns no results.
    const inv = await prisma.invitation.findFirst({
      where: { email, organizationId, status: "PENDING" },
    });
    if (inv?.deletedAt) return null;
    return inv;
  }

  async findByIdAndOrg(id: string, organizationId: string) {
    // MongoDB Prisma bug: deletedAt: null in where clause returns no results.
    const inv = await prisma.invitation.findFirst({
      where: { id, organizationId },
    });
    if (inv?.deletedAt) return null;
    return inv;
  }

  async listByOrganization(organizationId: string) {
    // MongoDB Prisma bug: deletedAt: null in where clause returns no results.
    const invitations = await prisma.invitation.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
    return invitations.filter((i) => !i.deletedAt);
  }

  async softDelete(id: string, organizationId: string) {
    return prisma.invitation.update({
      where: { id },
      data: { deletedAt: new Date(), status: "CANCELLED" },
    });
  }
}
