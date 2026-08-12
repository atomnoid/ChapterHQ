import { ZodError } from "zod";

import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { InvitationService, DuplicatePendingInvitationError } from "@/services/invitation.service";
import { RoleNotFoundError } from "@/services/role.service";
import { bulkInvitationSchema } from "@/validators/email.validator";

const invitationService = new InvitationService();

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();
    const { context } = await requirePermission(session.user.id, "members:create");
    const data = bulkInvitationSchema.parse(await request.json());

    const results: Array<{ email: string; status: "SUCCESS" | "FAILED" | "SKIPPED"; message?: string }> = [];
    const seen = new Set<string>();

    for (const row of data.rows) {
      const email = row.email.toLowerCase();
      if (seen.has(email)) {
        results.push({ email, status: "SKIPPED", message: "Duplicate row." });
        continue;
      }
      seen.add(email);

      try {
        await invitationService.createInvitation({
          organizationId: context.organizationId,
          email,
          roleId: row.roleId,
          committeeId: row.committeeId ?? context.activeCommitteeId ?? undefined,
          emailTemplateId: data.emailTemplateId,
          expiresInDays: data.expiresInDays,
          actorId: session.user.id,
        });
        results.push({ email, status: "SUCCESS" });
      } catch (error) {
        results.push({ email, status: "FAILED", message: error instanceof Error ? error.message : "Unable to invite member." });
      }
    }

    return apiResponse.success({ results }, "Bulk invitation operation finished.");
  } catch (error) {
    if (error instanceof Error && error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof ZodError) return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    if (error instanceof DuplicatePendingInvitationError) return apiResponse.badRequest(error.message);
    if (error instanceof RoleNotFoundError) return apiResponse.notFound(error.message);
    return apiResponse.serverError();
  }
}
