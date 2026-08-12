import { ZodError } from "zod";

import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permission-enforcer";
import type { EmailPrismaClient } from "@/types/email";
import { updateEmailTemplateSchema } from "@/validators/email.validator";

const db = prisma as unknown as EmailPrismaClient;

async function getTemplate(id: string, organizationId: string) {
  const template = await db.emailTemplate.findFirst({ where: { id, organizationId } });
  if (!template || template.deletedAt) return null;
  return template;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();
    const { context } = await requirePermission(session.user.id, "settings:update");
    const { id } = await params;
    const existing = await getTemplate(id, context.organizationId);
    if (!existing) return apiResponse.notFound("Email template not found.");

    const data = updateEmailTemplateSchema.parse(await request.json());
    const nextType = data.type ?? existing.type;
    if (data.isActive) {
      await db.emailTemplate.updateMany({
        where: { organizationId: context.organizationId, type: nextType },
        data: { isActive: false },
      });
    }

    const template = await db.emailTemplate.update({ where: { id }, data });
    return apiResponse.success(template, "Email template updated successfully.");
  } catch (error) {
    if (error instanceof Error && error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof ZodError) return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    return apiResponse.serverError();
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();
    const { context } = await requirePermission(session.user.id, "settings:update");
    const { id } = await params;
    const existing = await getTemplate(id, context.organizationId);
    if (!existing) return apiResponse.notFound("Email template not found.");

    const template = await db.emailTemplate.update({
      where: { id },
      data: { archivedAt: new Date(), isActive: false },
    });
    return apiResponse.success(template, "Email template archived successfully.");
  } catch (error) {
    if (error instanceof Error && error.name === "PermissionDeniedError") return apiResponse.forbidden();
    return apiResponse.serverError();
  }
}
