import { AuditLogRepository, CreateAuditLogData } from "@/repositories/audit-log.repository";
import { PaginationQuery, buildPaginationParams, buildPaginatedResult } from "@/lib/pagination";

export class AuditLogService {
  constructor(
    private readonly repository = new AuditLogRepository()
  ) {}

  async log(data: CreateAuditLogData) {
    return this.repository.create(data);
  }

  async getLogs(params: PaginationQuery & {
    organizationId: string;
    action?: string;
    resource?: string;
  }) {
    const paginationParams = buildPaginationParams(params);
    const { total, items } = await this.repository.list({
      ...paginationParams,
      organizationId: params.organizationId,
      action: params.action,
      resource: params.resource,
    });

    // Map output to match requirements: actor, action, resource, target, timestamp
    const mappedItems = items.map((log) => ({
      id: log.id,
      actor: {
        id: log.actorId,
        name: log.actorName ?? null,
        email: log.actorEmail ?? null,
      },
      action: log.action,
      resource: log.resource,
      target: {
        id: log.targetId ?? null,
        name: log.targetName ?? null,
      },
      metadata: log.metadata ?? null,
      timestamp: log.timestamp,
    }));

    return buildPaginatedResult(mappedItems, total, params);
  }
}
