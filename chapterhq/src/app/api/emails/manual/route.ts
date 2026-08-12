import { ZodError } from "zod";

import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permission-enforcer";
import { EmailService } from "@/services/email.service";
import { manualEmailSchema } from "@/validators/email.validator";

const emailService = new EmailService();

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();
    const { context } = await requirePermission(session.user.id, "members:read");
    const data = manualEmailSchema.parse(await request.json());

    const members = await prisma.member.findMany({
      where: {
        id: { in: data.memberIds },
        organizationId: context.organizationId,
        ...(context.activeCommitteeId ? { committeeMembers: { some: { committeeId: context.activeCommitteeId } } } : {}),
      },
      include: { user: true, organization: true },
    });

    const activeMembers = members.filter((member) => !member.deletedAt);
    if (activeMembers.length !== data.memberIds.length) return apiResponse.forbidden("One or more recipients are outside your scope.");

    const results = [];
    for (const member of activeMembers) {
      results.push(await emailService.sendTemplateEmail({
        organizationId: context.organizationId,
        to: member.user.email,
        templateId: data.templateId,
        templateType: "GENERAL",
        type: "GENERAL",
        sourceType: "MANUAL",
        sourceId: member.id,
        eventType: `MANUAL_${Date.now()}`,
        variables: {
          memberName: member.user.name,
          memberEmail: member.user.email,
          organizationName: member.organization.name,
          organizationSlug: member.organization.slug,
        },
      }));
    }

    const failed = results.filter((result) => !result.success);
    if (failed.length > 0) {
      return apiResponse.serverError(`Email could not be sent. ${failed[0]?.error ?? "Unknown email provider error."}`);
    }

    return apiResponse.success({ results }, "Manual email sent successfully.");
  } catch (error) {
    if (error instanceof Error && error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof ZodError) return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    return apiResponse.serverError();
  }
}
