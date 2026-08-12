import { ZodError } from "zod";

import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permission-enforcer";
import { EmailService } from "@/services/email.service";
import type { EmailPrismaClient } from "@/types/email";
import { createEmailTemplateSchema, emailTemplateQuerySchema } from "@/validators/email.validator";

const db = prisma as unknown as EmailPrismaClient;
const emailService = new EmailService();

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();
    const { context } = await requirePermission(session.user.id, "settings:read");
    const parsed = emailTemplateQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));

    const existingTemplates = await db.emailTemplate.findMany({
      where: { organizationId: context.organizationId },
      orderBy: { createdAt: "desc" },
    });

    if (existingTemplates.filter((template) => !template.deletedAt).length === 0) {
      await emailService.seedDefaultTemplates(context.organizationId);
    }

    const templates = await db.emailTemplate.findMany({
      where: {
        organizationId: context.organizationId,
        ...(parsed.type ? { type: parsed.type } : {}),
      },
      orderBy: { updatedAt: "desc" },
    });

    const search = parsed.search.toLowerCase();
    const filtered = templates
      .filter((template) => !template.deletedAt)
      .filter((template) => !search || template.name.toLowerCase().includes(search) || template.subject.toLowerCase().includes(search));

    return apiResponse.success({ items: filtered });
  } catch (error) {
    if (error instanceof Error && error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof ZodError) return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    return apiResponse.serverError();
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();
    const { context } = await requirePermission(session.user.id, "settings:update");
    const data = createEmailTemplateSchema.parse(await request.json());

    if (data.isActive) {
      await db.emailTemplate.updateMany({
        where: { organizationId: context.organizationId, type: data.type },
        data: { isActive: false },
      });
    }

    const template = await db.emailTemplate.create({
      data: { organizationId: context.organizationId, ...data },
    });

    return apiResponse.created(template, "Email template created successfully.");
  } catch (error) {
    if (error instanceof Error && error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof ZodError) return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    return apiResponse.serverError();
  }
}
