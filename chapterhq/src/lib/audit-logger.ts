import { AuditLogService } from "@/services/audit-log.service";
import { prisma } from "@/lib/prisma";

const auditLogService = new AuditLogService();

interface LogContext {
  userId: string;
  organizationId: string;
}

export async function logActivity(
  context: LogContext,
  action: string,
  resource: string,
  targetId: string | null,
  targetName: string | null,
  metadata?: any
) {
  try {
    // Resolve actor info from user record
    const user = await prisma.user.findFirst({
      where: { id: context.userId },
      select: { name: true, email: true },
    });

    await auditLogService.log({
      organizationId: context.organizationId,
      actorId: context.userId,
      actorName: user?.name || undefined,
      actorEmail: user?.email || undefined,
      action,
      resource,
      targetId: targetId || undefined,
      targetName: targetName || undefined,
      metadata,
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
