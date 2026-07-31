import { prisma } from "@/lib/prisma";
import { PaginationParams } from "@/lib/pagination";

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

  async list(params: PaginationParams & { organizationId: string }) {
    const whereClause = {
      organizationId: params.organizationId,
    };

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
