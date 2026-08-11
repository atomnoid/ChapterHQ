import { NextRequest } from "next/server";
import { ZodError, z } from "zod";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { MemberService } from "@/services/member.service";

const memberService = new MemberService();
const querySchema = z.object({ search: z.string().optional() });

// Recipient picker endpoint: it deliberately uses notifications:create, not members:read,
// and always derives organization/committee scope from the trusted session context.
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();
    const { context, roles } = await requirePermission(session.user.id, "notifications:create");
    const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    const isOrganizationAdministrator = roles.some((role) => role.scope === "ORGANIZATION");
    const result = await memberService.getMembers({
      organizationId: context.organizationId,
      activeCommitteeId: isOrganizationAdministrator ? null : context.activeCommitteeId ?? null,
      status: "ACTIVE",
      search: query.search,
      page: 1,
      limit: 10000,
      order: "asc",
    });
    return apiResponse.success(result);
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof ZodError) return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    return apiResponse.serverError();
  }
}
