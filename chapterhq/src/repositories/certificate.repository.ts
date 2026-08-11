import { prisma } from "@/lib/prisma";
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
    return prisma.certificate.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
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

  async existsByCredentialId(organizationId: string, credentialId: string, excludeId?: string) {
    const cert = await prisma.certificate.findFirst({
      where: {
        organizationId,
        credentialId,
        deletedAt: null,
        NOT: excludeId ? { id: excludeId } : undefined,
      },
    });
    return !!cert;
  }

  async list(params: PaginationParams & { organizationId: string }) {
    const whereClause: any = {
      organizationId: params.organizationId,
      deletedAt: null,
    };

    if (params.search) {
      whereClause.OR = [
        { title: { contains: params.search, mode: "insensitive" } },
        { description: { contains: params.search, mode: "insensitive" } },
        { credentialId: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const orderBy = buildOrderBy(params.sortBy, params.order, "issueDate");

    const [total, items] = await Promise.all([
      prisma.certificate.count({ where: whereClause }),
      prisma.certificate.findMany({
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
