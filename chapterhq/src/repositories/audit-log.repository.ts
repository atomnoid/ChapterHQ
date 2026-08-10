import { prisma } from "@/lib/prisma";
import { PaginationParams } from "@/lib/pagination";
import { Prisma } from "@prisma/client";

export interface CreateAuditLogData {
  organizationId: string;
  actorId: string;
  actorName?: string;
  actorEmail?: string;
  action: string;
  resource: string;
  targetId?: string;
  targetName?: string;
  metadata?: any;
}

export class AuditLogRepository {
  async create(data: CreateAuditLogData) {
    return prisma.auditLog.create({
      data: {
        organizationId: data.organizationId,
        actorId: data.actorId,
        actorName: data.actorName,
        actorEmail: data.actorEmail,
        action: data.action,
        resource: data.resource,
        targetId: data.targetId,
        targetName: data.targetName,
        metadata: data.metadata,
      },
    });
  }

  async list(params: PaginationParams & {
    organizationId: string;
    action?: string;
    resource?: string;
  }) {
    const whereClause: Prisma.AuditLogWhereInput = {
      organizationId: params.organizationId,
    };

    if (params.action) {
      whereClause.action = params.action;
    }

    if (params.resource) {
      whereClause.resource = params.resource;
    }

    // search filters on actor name or actor email (case-insensitive contains)
    if (params.search) {
      whereClause.OR = [
        { actorName: { contains: params.search, mode: "insensitive" } },
        { actorEmail: { contains: params.search, mode: "insensitive" } },
        { targetName: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.auditLog.count({ where: whereClause }),
      prisma.auditLog.findMany({
        where: whereClause,
        skip: params.skip,
        take: params.take,
        orderBy: {
          timestamp: "desc",
        },
      }),
    ]);

    return { total, items };
  }
}
