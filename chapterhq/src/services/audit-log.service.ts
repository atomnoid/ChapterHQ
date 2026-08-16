import { AuditLogRepository, CreateAuditLogData } from "@/repositories/audit-log.repository";
import { PaginationQuery, buildPaginationParams, buildPaginatedResult } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

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

    // Collect IDs that might need resolution (memberId, userId, targetId if member/user)
    const memberIdSet = new Set<string>();
    const userIdSet = new Set<string>();

    for (const log of items) {
      if (log.targetId) {
        if (log.resource === "member" || log.resource === "core_member" || log.resource === "committee_member") {
          memberIdSet.add(log.targetId);
        } else if (log.resource === "user") {
          userIdSet.add(log.targetId);
        }
      }

      if (log.metadata && typeof log.metadata === "object" && !Array.isArray(log.metadata)) {
        const meta = log.metadata as Record<string, unknown>;
        if (typeof meta.memberId === "string" && meta.memberId) {
          memberIdSet.add(meta.memberId);
        }
        if (typeof meta.userId === "string" && meta.userId) {
          userIdSet.add(meta.userId);
        }
      }
    }

    const memberNameMap = new Map<string, string>();
    if (memberIdSet.size > 0) {
      const members = await prisma.member.findMany({
        where: { id: { in: Array.from(memberIdSet) } },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      for (const m of members) {
        const displayName = m.user?.name || m.user?.email || `Member ${m.id.slice(-4)}`;
        memberNameMap.set(m.id, displayName);
        if (m.userId) {
          memberNameMap.set(m.userId, displayName);
        }
      }
    }

    if (userIdSet.size > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: Array.from(userIdSet) } },
        select: { id: true, name: true, email: true },
      });
      for (const u of users) {
        if (!memberNameMap.has(u.id)) {
          memberNameMap.set(u.id, u.name || u.email || `User ${u.id.slice(-4)}`);
        }
      }
    }

    const resolveName = (value: unknown) => {
      if (typeof value !== "string" || !value) return null;
      return memberNameMap.get(value) ?? null;
    };

    // Map output to match requirements: actor, action, resource, target, timestamp
    const mappedItems = items.map((log) => {
      let resolvedTargetName = log.targetName ?? null;
      if (log.targetId) {
        const lookup = resolveName(log.targetId);
        if (lookup && (!resolvedTargetName || resolvedTargetName.startsWith("Member ") || resolvedTargetName.startsWith("User "))) {
          resolvedTargetName = lookup;
        }
      }

      let enrichedMetadata = log.metadata ? { ...(log.metadata as Record<string, unknown>) } : null;
      if (enrichedMetadata) {
        const memberId = typeof enrichedMetadata.memberId === "string" ? enrichedMetadata.memberId : null;
        const userId = typeof enrichedMetadata.userId === "string" ? enrichedMetadata.userId : null;
        const targetId = typeof enrichedMetadata.targetId === "string" ? enrichedMetadata.targetId : null;

        const memberName = memberId ? resolveName(memberId) : null;
        const userName = userId ? resolveName(userId) : null;
        const targetName = targetId ? resolveName(targetId) : null;

        if (memberName) {
          enrichedMetadata.memberName = memberName;
          delete enrichedMetadata.memberId;
        }
        if (userName) {
          enrichedMetadata.userName = userName;
          delete enrichedMetadata.userId;
        }
        if (targetName) {
          enrichedMetadata.targetName = targetName;
          delete enrichedMetadata.targetId;
        }

        if (typeof enrichedMetadata.assigneeId === "string") {
          const assigneeName = resolveName(enrichedMetadata.assigneeId);
          if (assigneeName) {
            enrichedMetadata.assigneeName = assigneeName;
            delete enrichedMetadata.assigneeId;
          }
        }
      }

      return {
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
          name: resolvedTargetName,
        },
        metadata: enrichedMetadata,
        timestamp: log.timestamp,
      };
    });

    return buildPaginatedResult(mappedItems, total, params);
  }
}
