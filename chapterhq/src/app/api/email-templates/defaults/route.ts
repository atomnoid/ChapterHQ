import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { EmailService } from "@/services/email.service";

const emailService = new EmailService();

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();
    const { context } = await requirePermission(session.user.id, "settings:update");

    await emailService.seedDefaultTemplates(context.organizationId);

    return apiResponse.success(null, "Default email templates are available.");
  } catch (error) {
    if (error instanceof Error && error.name === "PermissionDeniedError") return apiResponse.forbidden();
    return apiResponse.serverError();
  }
}
