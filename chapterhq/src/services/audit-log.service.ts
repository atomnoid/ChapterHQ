import { AuditLogRepository, CreateAuditLogData } from "@/repositories/audit-log.repository";
import { PaginationQuery, buildPaginationParams, buildPaginatedResult } from "@/lib/pagination";

export class AuditLogService {
  constructor(
    private readonly repository = new AuditLogRepository()
  ) {}

  async log(data: CreateAuditLogData) {
    return this.repository.create(data);
  }

  async getLogs(params: PaginationQuery & { organizationId: string }) {
    const paginationParams = buildPaginationParams(params);
    const { total, items } = await this.repository.list({
      ...paginationParams,
      organizationId: params.organizationId,
    });

    // Map output to match requirements: actor, action, resource, target, timestamp
    const mappedItems = items.map((log) => ({
      id: log.id,
      actor: {
        id: log.actorId,
        name: log.actorName,
        email: log.actorEmail,
      },
      action: log.action,
      resource: log.resource,
      target: {
        id: log.targetId,
        name: log.targetName,
      },
      metadata: log.metadata,
      timestamp: log.timestamp,
    }));

    return buildPaginatedResult(mappedItems, total, params);
  }
}
