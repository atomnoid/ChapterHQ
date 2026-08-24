import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { buildOrderBy, PaginationParams } from "@/lib/pagination";

export interface CreateCertificateData {
  organizationId: string;
  memberId: string;
  title: string;
  description?: string;
  issueDate: Date;
  expiryDate?: Date;
  credentialId?: string;
  certificateUrl?: string;
}

export interface UpdateCertificateData {
  memberId?: string;
  title?: string;
  description?: string;
  issueDate?: Date;
  expiryDate?: Date;
  credentialId?: string;
  certificateUrl?: string;
}

export class CertificateRepository {
  async create(data: CreateCertificateData) {
    return prisma.certificate.create({
      data: {
        organizationId: data.organizationId,
        memberId: data.memberId,
        title: data.title,
        description: data.description,
        issueDate: data.issueDate,
        expiryDate: data.expiryDate,
        credentialId: data.credentialId,
        certificateUrl: data.certificateUrl,
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
    });
  }

  async update(id: string, organizationId: string, data: UpdateCertificateData) {
    return prisma.certificate.update({
      where: {
        id,
        organizationId,
      },
      data,
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
  }

  async findById(id: string, organizationId: string) {
    // MongoDB Prisma bug: deletedAt: null in where clause returns no results.
    // Fetch without filter and post-filter in JS.
    const certificate = await prisma.certificate.findFirst({
      where: {
        id,
        organizationId,
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
    });
    if (certificate?.deletedAt) return null;
    return certificate;
  }

  async existsByCredentialId(organizationId: string, credentialId: string, excludeId?: string) {
    // MongoDB Prisma bug: deletedAt: null in where clause returns no results.
    // Fetch without filter and post-filter in JS.
    const cert = await prisma.certificate.findFirst({
      where: {
        organizationId,
        credentialId,
        NOT: excludeId ? { id: excludeId } : undefined,
      },
    });
    if (cert?.deletedAt) return false;
    return !!cert;
  }

  async list(params: PaginationParams & { organizationId: string; activeCommitteeId?: string | null }) {
    const whereClause: Prisma.CertificateWhereInput = {
      organizationId: params.organizationId,
      // MongoDB Prisma bug: deletedAt: null removed; JS post-filter applied below.
    };

    if (params.activeCommitteeId) {
      const assignments = await prisma.committeeMember.findMany({
        where: { committeeId: params.activeCommitteeId },
        select: { memberId: true, deletedAt: true },
      });
      const activeMemberIds = assignments
        .filter((a) => !a.deletedAt)
        .map((a) => a.memberId);
      whereClause.memberId = { in: activeMemberIds };
    }

    if (params.search) {
      whereClause.OR = [
        { title: { contains: params.search, mode: "insensitive" } },
        { description: { contains: params.search, mode: "insensitive" } },
        { credentialId: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const orderBy = buildOrderBy(params.sortBy, params.order, "issueDate");

    const allItems = await prisma.certificate.findMany({
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
    const notDeleted = allItems.filter((c) => !c.deletedAt);
    const total = notDeleted.length;
    const items = notDeleted.slice(params.skip, params.skip + params.take);

    return { total, items };
  }

  async softDelete(id: string, organizationId: string) {
    return prisma.certificate.update({
      where: {
        id,
        organizationId,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
