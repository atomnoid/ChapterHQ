import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permission-enforcer";
import type { EmailPrismaClient } from "@/types/email";

const db = prisma as unknown as EmailPrismaClient;

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();
    const { context } = await requirePermission(session.user.id, "settings:read");

    const logs = await db.emailLog.findMany({
      where: { organizationId: context.organizationId },
      include: { template: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return apiResponse.success({ items: logs });
  } catch (error) {
    if (error instanceof Error && error.name === "PermissionDeniedError") return apiResponse.forbidden();
    return apiResponse.serverError();
  }
}
