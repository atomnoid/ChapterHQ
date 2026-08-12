import { AuditLogService } from "@/services/audit-log.service";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const auditLogService = new AuditLogService();

interface LogContext { userId: string; organizationId: string; }
type AuditMetadata = Prisma.InputJsonValue;

interface LegacyLogEntry { organizationId: string; actorId: string; action: string; resource: string; targetId?: string | null; targetName?: string | null; metadata?: AuditMetadata; }

export function logActivity(entry: LegacyLogEntry): Promise<void>;
export function logActivity(context: LogContext, action: string, resource: string, targetId: string | null, targetName: string | null, metadata?: AuditMetadata): Promise<void>;
export async function logActivity(contextOrEntry: LogContext | LegacyLogEntry, action?: string, resource?: string, targetId?: string | null, targetName?: string | null, metadata?: AuditMetadata) {
  try {
    const legacy = "actorId" in contextOrEntry;
    const context = legacy ? { userId: contextOrEntry.actorId, organizationId: contextOrEntry.organizationId } : contextOrEntry;
    const resolvedAction = legacy ? contextOrEntry.action : action!;
    const resolvedResource = legacy ? contextOrEntry.resource : resource!;
    const resolvedTargetId = legacy ? contextOrEntry.targetId : targetId;
    const resolvedTargetName = legacy ? contextOrEntry.targetName : targetName;
    const resolvedMetadata = legacy ? contextOrEntry.metadata : metadata;
    const user = await prisma.user.findFirst({ where: { id: context.userId }, select: { name: true, email: true } });
    await auditLogService.log({ organizationId: context.organizationId, actorId: context.userId, actorName: user?.name || undefined, actorEmail: user?.email || undefined, action: resolvedAction, resource: resolvedResource, targetId: resolvedTargetId || undefined, targetName: resolvedTargetName || undefined, metadata: resolvedMetadata });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
